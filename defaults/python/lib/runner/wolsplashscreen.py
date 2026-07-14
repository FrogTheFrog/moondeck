import asyncio
import contextlib

from typing import Optional
from datetime import datetime, timedelta, timezone
from ..logger import logger
from ..utils import wake_on_lan
from ..splashscreen.overlay import OverlayStack
from ..splashscreen.wolscreen import WolScreen


class WolSplashScreen:
    def __init__(self, stack: OverlayStack, address: str, mac: str, timeout: int, hostname: str, wol_port: int, custom_wol_exec: Optional[str]):        
        self.__address = address
        self.__hostname = hostname
        self.__mac = mac
        self.__wol_port = wol_port
        self.__custom_wol_exec = custom_wol_exec
        self.__wol_task = None
        if timeout > 0:
            self.__timeout_data = {
                "end": datetime.now(timezone.utc) + timedelta(seconds=timeout),
                "wol_screen": WolScreen(stack, f"Checking connection to {self.__hostname}...")
            }
        else:
            self.__timeout_data = None

    async def __wol_loop(self):
        while True:
            await wake_on_lan(hostname=self.__hostname,
                              address=self.__address,
                              mac=self.__mac,
                              port=self.__wol_port,
                              custom_exec=self.__custom_wol_exec)
            await asyncio.sleep(10)

    async def __aenter__(self):
        if self.__timeout_data is None:
            return self
        
        await self.__timeout_data["wol_screen"].__aenter__()
        self.__wol_task = asyncio.create_task(self.__wol_loop())
        return self

    async def __aexit__(self, exc_type, exc, tb):
        if self.__timeout_data:
            assert self.__wol_task

            self.__wol_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self.__wol_task

            await self.__timeout_data["wol_screen"].__aexit__(exc_type, exc, tb)

    def update(self, buddy_status, server_status) -> bool:
        logger.info(f"Buddy: {buddy_status}, Server: {server_status}")
        if self.__timeout_data is None:
            return False

        if ((buddy_status is None or buddy_status) and server_status) or (datetime.now(timezone.utc) > self.__timeout_data["end"]):
            return False
        
        self.__timeout_data["wol_screen"].set_label_text(text=f"Waiting for {self.__hostname}...")
        return True
