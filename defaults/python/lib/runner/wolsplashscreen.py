import asyncio
import contextlib

from typing import Optional
from datetime import datetime, timedelta, timezone
from ..logger import logger
from ..utils import wake_on_lan
from ..splashscreen.overlay import OverlayStack
from ..splashscreen.wolscreen import WolScreen


class WolSplashScreen:
    def __init__(self, stack: OverlayStack, gamestream_status: bool | None, buddy_status: bool | None, address: str, mac: str, timeout: int, hostname: str, wol_port: int, send_wol_once: bool, custom_wol_exec: Optional[str]):        
        self.__address = address
        self.__hostname = hostname
        self.__mac = mac
        self.__wol_port = wol_port
        self.__send_wol_once = send_wol_once
        self.__custom_wol_exec = custom_wol_exec
        self.__wol_task = None
        self.__wol_screen_task = None
        if timeout > 0:
            self.__timeout_data = {
                "end": datetime.now(timezone.utc) + timedelta(seconds=timeout),
                "wol_screen": WolScreen(stack, self.__hostname, gamestream_status, buddy_status),
                "wol_shown": False
            }
        else:
            self.__timeout_data = None

    async def __do_wol(self):
        await wake_on_lan(hostname=self.__hostname,
                          address=self.__address,
                          mac=self.__mac,
                          port=self.__wol_port,
                          custom_exec=self.__custom_wol_exec)

    async def __wol_loop(self):
        while True:
            await self.__do_wol()
            await asyncio.sleep(10)

    async def __show_wol_screen(self):
        if self.__timeout_data:
            await asyncio.sleep(3)
            self.__timeout_data["wol_shown"] = True
            await self.__timeout_data["wol_screen"].__aenter__()      

    async def __aenter__(self):
        if self.__timeout_data is None:
            return self

        if self.__send_wol_once is False:
            self.__wol_task = asyncio.create_task(self.__wol_loop())
        self.__wol_screen_task = asyncio.create_task(self.__show_wol_screen())
        return self

    async def __aexit__(self, exc_type, exc, tb):
        if self.__timeout_data:
            assert self.__wol_screen_task

            self.__wol_screen_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self.__wol_screen_task

            if self.__wol_task:
                self.__wol_task.cancel()
                with contextlib.suppress(asyncio.CancelledError):
                    await self.__wol_task

            if self.__timeout_data["wol_shown"]:
                await self.__timeout_data["wol_screen"].__aexit__(exc_type, exc, tb)

    async def update(self, buddy_status: bool | None, server_status: bool | None) -> bool:
        logger.info(f"Buddy: {buddy_status}, Server: {server_status}")
        if self.__timeout_data is None:
            return False

        buddy_status_is_irrelevant = buddy_status is None
        server_status_is_irrelevant = server_status is None

        buddy_is_on = buddy_status_is_irrelevant or buddy_status
        server_is_on = server_status_is_irrelevant or server_status
        timeout_elapsed = datetime.now(timezone.utc) > self.__timeout_data["end"]
        if (buddy_is_on and server_is_on) or timeout_elapsed:
            return False

        buddy_is_off = buddy_status_is_irrelevant or not buddy_status
        server_is_off = server_status_is_irrelevant or not server_status
        if buddy_is_off and server_is_off and self.__send_wol_once:
            await self.__do_wol()
            self.__send_wol_once = None
        
        show_status = not buddy_status_is_irrelevant and not server_status_is_irrelevant
        self.__timeout_data["wol_screen"].set_status(gamestream=server_status if show_status else None,
                                                     buddy=buddy_status if show_status else None)
        
        return True
