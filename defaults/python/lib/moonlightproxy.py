import asyncio
import contextlib
import os
import shutil

from typing import Optional, TypedDict
from asyncio.subprocess import Process
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


class MoonlightProxy(contextlib.AbstractAsyncContextManager):

    flatpak_moonlight = "com.moonlight_stream.Moonlight"

    def __init__(self, hostname: str, host_app: str, audio: Optional[str], resolution: Optional[ResolutionDimensions], exec_path: Optional[str]) -> None: 
        self.hostname = hostname
        self.audio = audio
        self.resolution = resolution
        self.host_app = host_app
        self.exec_path = exec_path
        self.process: Optional[Process] = None

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        return await self.terminate()

    async def start(self):
        if self.process:
            return

        if self.exec_path is None:
            exec = self.__get_flatpak_exec()
            args = ["run", "--arch=x86_64", "--command=moonlight", self.flatpak_moonlight]

            if exec is None:
                logger.error("flatpak is not installed!")
                return
        else:
            exec = self.exec_path
            args = []

        if self.audio:
            args += ["--audio-config", self.audio]

        if self.resolution:
            if self.resolution["size"]:
                args += ["--resolution", f"{self.resolution['size']['width']}x{self.resolution['size']['height']}"]
            if self.resolution["fps"]:
                args += ["--fps", f"{self.resolution['fps']}"]
            if self.resolution["hdr"] is not None:
                args += ["--hdr" if self.resolution["hdr"] else "--no-hdr"]
            if self.resolution["bitrate"]:
                args += ["--bitrate", f"{self.resolution['bitrate']}"]
        args += ["--no-quit-after", "stream", self.hostname, self.host_app]

        logger.info(f"Executing: {exec} {' '.join(args)}")
        self.process = await asyncio.create_subprocess_exec(exec, *args,
                                                            stdout=asyncio.subprocess.PIPE,
                                                            stderr=asyncio.subprocess.STDOUT)

    async def terminate(self):
        if not self.process:
            return

        await self.terminate_all_instances(kill_all=False)
        self.process = None

    async def wait(self):
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
        await asyncio.wait({process_task, log_task}, return_when=asyncio.ALL_COMPLETED)

    async def terminate_all_instances(self, kill_all: bool):
        if self.exec_path is None or kill_all:
            flatpak_exec = self.__get_flatpak_exec()
            if flatpak_exec is None:
                return

            kill_proc = await asyncio.create_subprocess_exec(flatpak_exec, "kill", MoonlightProxy.flatpak_moonlight,
                                                             stdout=asyncio.subprocess.PIPE,
                                                             stderr=asyncio.subprocess.PIPE)
            output, _ = await kill_proc.communicate()
            if output:
                newline = "\n"
                logger.info(f"flatpak kill output: {newline}{output.decode().strip(newline)}")

        if self.exec_path is not None or kill_all:
            if self.process:
                try:
                    self.process.kill()
                except ProcessLookupError:
                    pass
                self.process = None
            else:
                kill_proc = await asyncio.create_subprocess_shell("pkill -f -e -i \"moonlight\"",
                                                                  stdout=asyncio.subprocess.PIPE,
                                                                  stderr=asyncio.subprocess.PIPE)
                output, _ = await kill_proc.communicate()
                if output:
                    newline = "\n"
                    logger.info(f"pkill output: {newline}{output.decode().strip(newline)}")

    async def is_moonlight_installed(self):
        if self.exec_path is None:
            flatpak_exec = self.__get_flatpak_exec()
            if flatpak_exec is None:
                logger.error("flatpak is not installed!")
                return False

            list_proc = await asyncio.create_subprocess_exec(flatpak_exec, "list",
                                                             stdout=asyncio.subprocess.PIPE,
                                                             stderr=asyncio.subprocess.PIPE)
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
        return shutil.which("flatpak")
