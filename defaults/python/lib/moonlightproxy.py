import contextlib

from typing import Optional, TypedDict, cast
from .logger import logger
from . import constants


class ResolutionSize(TypedDict):
    width: int
    height: int


class ResolutionDimensions(TypedDict):
    size: Optional[ResolutionSize]
    bitrate: Optional[int]
    fps: Optional[int]
    hdr: Optional[bool]


class CommandLineOptions(TypedDict):
    audio: Optional[str]
    resolution: Optional[ResolutionDimensions]
    quit_after: Optional[bool]
    show_performance_stats: Optional[bool]    
    video_codec: Optional[str]


class MoonlightProxy(contextlib.AbstractAsyncContextManager):

    flatpak_moonlight = "com.moonlight_stream.Moonlight"

    def __init__(self, exec_path: Optional[str]) -> None:
        # Lazy import to improve CLI performance
        import psutil
        from asyncio.subprocess import Process

        self.exec_path = exec_path
        self.process: Optional[Process] = None
        self.__proc: Optional[psutil.Process] = None

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        return await self.terminate()
    
    async def get_apps(self, hostname: str):
        # Lazy import to improve CLI performance
        import asyncio
        import psutil

        assert self.process is None, "Another instance of Moonlight has been started already!"
        exec, args = self.__get_exec_with_args()

        args += ["list", hostname]
        logger.info(f"Executing: {exec} {' '.join(args)}")
        self.process = await asyncio.create_subprocess_exec(exec, *args,
                                                            stdout=asyncio.subprocess.PIPE,
                                                            stderr=asyncio.subprocess.DEVNULL)
        self.__proc = psutil.Process(self.process.pid)

        output, _ = await self.process.communicate()
        success = self.process.returncode == 0
        self.process = None
        self.__proc = None

        if success:
            apps: set[str] = set()
            if output:
                output = output.decode()
                output = output.split("\n")
                for app in output:
                    if app:
                        apps.add(app)
            return sorted(list(apps))
        return None     

    async def start(self, hostname: str, host_app: str, cmd_options: Optional[CommandLineOptions] = None):
        # Lazy import to improve CLI performance
        import asyncio
        import psutil
        
        assert self.process is None, "Another instance of Moonlight has been started already!"
        exec, args = self.__get_exec_with_args()

        if cmd_options:
            if (audio := cmd_options["audio"]) is not None:
                args += ["--audio-config", audio]

            if (resolution := cmd_options["resolution"]) is not None:
                if resolution["size"]:
                    args += ["--resolution", f"{resolution['size']['width']}x{resolution['size']['height']}"]
                if resolution["fps"]:
                    args += ["--fps", f"{resolution['fps']}"]
                if resolution["hdr"] is not None:
                    args += ["--hdr" if resolution["hdr"] else "--no-hdr"]
                if resolution["bitrate"]:
                    args += ["--bitrate", f"{resolution['bitrate']}"]

            if (quit_after := cmd_options["quit_after"]) is not None:
                if quit_after:
                    args += ["--quit-after"]
                else:
                    args += ["--no-quit-after"]
            
            if (show_performance_stats := cmd_options["show_performance_stats"]) is not None:
                if show_performance_stats:
                    args += ["--performance-overlay"]
                else:
                    args += ["--no-performance-overlay"]
            
            if (video_codec := cmd_options["video_codec"]) is not None:
                args += ["--video-codec", video_codec]

        args += ["stream", hostname, host_app]

        logger.info(f"Executing: {exec} {' '.join(args)}")
        self.process = await asyncio.create_subprocess_exec(exec, *args,
                                                            stdout=asyncio.subprocess.PIPE,
                                                            stderr=asyncio.subprocess.STDOUT)
        self.__proc = psutil.Process(self.process.pid)

    async def terminate(self):
        # Lazy import to improve CLI performance
        import asyncio
        import psutil

        if self.process is None:
            return

        assert self.__proc is not None
        def ps_signal(kill: bool):
            def do_signal(proc_or_child):
                try:
                    if kill:
                        proc_or_child.kill()
                    else:
                        proc_or_child.terminate()
                except psutil.NoSuchProcess:
                    pass
            
            proc = cast(psutil.Process, self.__proc)
            for child in list(proc.children(recursive=True)):
                do_signal(child)

            do_signal(proc)

        try:
            logger.info("Trying to gracefully terminate Moonlight...")
            ps_signal(kill=False)
            try:
                await asyncio.wait_for(self.process.wait(), timeout=5.0)
                logger.info("Moonlight terminated gracefully.")
            except asyncio.TimeoutError:
                logger.info("Moonlight did not terminate in time - killing it!")
                ps_signal(kill=True)
                await self.process.wait()
        except ProcessLookupError:
            pass
        finally:
            self.process = None
            self.__proc = None

    async def wait(self):
        # Lazy import to improve CLI performance
        import asyncio

        if not self.process:
            return

        async def log_stream(stream: Optional[asyncio.StreamReader]):
            if not stream:
                logger.error("NULL Moonlight stream handle - output will not be saved!")
                return

            logger.info("Starting to save Moonlight output.")
            with open(constants.MOONLIGHT_LOG_FILE, "w", 1) as file:
                while not stream.at_eof():
                    data = await stream.readline()
                    file.write(data.decode())
            logger.info("Finished saving Moonlight output.")

        process_task = asyncio.create_task(self.process.wait())
        log_task = asyncio.create_task(log_stream(self.process.stdout))
        await asyncio.wait([process_task, log_task], return_when=asyncio.ALL_COMPLETED)

    async def terminate_all_instances(self):
        await self.__kill_flatpak_app()
        await self.__kill_any_moonlight_app()

    async def is_moonlight_installed(self):
        # Lazy import to improve CLI performance
        import asyncio
        import os

        if self.exec_path is None:
            flatpak_exec = self.__get_flatpak_exec()
            if flatpak_exec is None:
                logger.error("flatpak is not installed!")
                return False

            list_proc = await asyncio.create_subprocess_exec(flatpak_exec, "list",
                                                             stdout=asyncio.subprocess.PIPE,
                                                             stderr=asyncio.subprocess.DEVNULL)
            output, _ = await list_proc.communicate()
            if output:
                return output.decode().find(MoonlightProxy.flatpak_moonlight) != -1
        else:
            if os.path.isfile(self.exec_path):
                if os.access(self.exec_path, os.X_OK):
                    return True
                else:
                    logger.info(f"File \"{self.exec_path}\" is not an executable!")
            else:
                logger.info(f"\"{self.exec_path}\" is not a valid file!")

        return False
    
    def __get_flatpak_exec(self):
        import shutil
        return shutil.which("flatpak")
    
    def __get_exec_with_args(self):
        if self.exec_path is None:
            exec = self.__get_flatpak_exec()
            args = ["run", "--arch=x86_64", "--command=moonlight", self.flatpak_moonlight]

            if exec is None:
                raise Exception("Moonlight is not installed!")
        else:
            exec = self.exec_path
            args = []

        return exec, args
    
    async def __kill_flatpak_app(self):
        # Lazy import to improve CLI performance
        import asyncio

        flatpak_exec = self.__get_flatpak_exec()
        if flatpak_exec is None:
            return

        kill_proc = await asyncio.create_subprocess_exec(flatpak_exec, "kill", MoonlightProxy.flatpak_moonlight,
                                                         stdout=asyncio.subprocess.PIPE,
                                                         stderr=asyncio.subprocess.STDOUT)
        output, _ = await kill_proc.communicate()
        if output:
            newline = "\n"
            logger.info(f"flatpak kill output: {newline}{output.decode().strip(newline)}")

    async def __kill_any_moonlight_app(self):
        # Lazy import to improve CLI performance
        import asyncio

        kill_proc = await asyncio.create_subprocess_shell("pkill -f -e -i \"moonlight\"",
                                                          stdout=asyncio.subprocess.PIPE,
                                                          stderr=asyncio.subprocess.STDOUT)
        output, _ = await kill_proc.communicate()
        if output:
            newline = "\n"
            logger.info(f"pkill output: {newline}{output.decode().strip(newline)}")
        
