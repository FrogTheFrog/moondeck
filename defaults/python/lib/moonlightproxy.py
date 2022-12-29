import asyncio
import contextlib

from typing import Optional, TypedDict
from asyncio.subprocess import Process
from .logger import logger


class ResolutionDimensions(TypedDict):
    width: int
    height: int


class MoonlightProxy(contextlib.AbstractAsyncContextManager):

    program = "/usr/bin/flatpak"
    moonlight = "com.moonlight_stream.Moonlight"

    def __init__(self, hostname: str, resolution: Optional[ResolutionDimensions]) -> None: 
        self.hostname = hostname
        self.resolution = resolution
        self.process: Optional[Process] = None

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        return await self.terminate()

    async def start(self):
        if self.process:
            return

        args = ["run", "--branch=stable", "--arch=x86_64", "--command=moonlight", self.moonlight]
        if self.resolution:
            args += ["--resolution", f"{self.resolution['width']}x{self.resolution['height']}"]
        args += ["stream", self.hostname, "MoonDeckStream"]

        self.process = await asyncio.create_subprocess_exec(self.program, *args,
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
