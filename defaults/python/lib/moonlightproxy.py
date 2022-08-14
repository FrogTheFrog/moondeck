import asyncio

from typing import Optional
from asyncio.subprocess import Process
from .logger import logger


class MoonlightProxy:
    program = "/usr/bin/flatpak"
    moonlight = "com.moonlight_stream.Moonlight"

    def __init__(self, hostname) -> None: 
        self.hostname = hostname
        self.process: Optional[Process] = None

    async def start(self):
        if self.process:
            return

        self.process = await asyncio.create_subprocess_exec(self.program, "run",
                                                            "--branch=stable", "--arch=x86_64", "--command=moonlight",
                                                            self.moonlight, "stream", self.hostname, "Steam",
                                                            stdout=asyncio.subprocess.DEVNULL,
                                                            stderr=asyncio.subprocess.STDOUT)

    async def terminate(self):
        if not self.process:
            return

        await self.terminate_all_instances()
        self.process = None

    async def wait(self):
        if not self.process:
            return

        await self.process.wait()

    @staticmethod
    async def terminate_all_instances(pipe_to_stdout: bool = False):
        kill_proc = await asyncio.create_subprocess_exec(MoonlightProxy.program, "kill", MoonlightProxy.moonlight,
                                                         stdout=asyncio.subprocess.PIPE,
                                                         stderr=asyncio.subprocess.STDOUT if pipe_to_stdout else asyncio.subprocess.PIPE)
        output, _ = await kill_proc.communicate()
        if output:
            logger.info(f"flatpak kill output: {output}")

    @staticmethod
    async def is_moonlight_installed():
        kill_proc = await asyncio.create_subprocess_exec(MoonlightProxy.program, "list",
                                                         stdout=asyncio.subprocess.PIPE,
                                                         stderr=asyncio.subprocess.PIPE)
        output, _ = await kill_proc.communicate()
        if output:
            return output.decode("utf-8").find(MoonlightProxy.moonlight) != -1
        return False
