import aiohttp
import asyncio
import contextlib
from . import constants

from enum import Enum
from typing import Optional
from .buddyrequests import BuddyRequests, PairingState, PcState, PcStateChange
from .logger import logger


class HelloResult(Enum):
    SslVerificationFailed = "SSL certificate could not be verified!"
    Exception = "An exception was thrown, check the logs!"
    VersionMismatch = "MoonDeck/Buddy needs update!"
    Restarting = "Buddy is restarting the PC!"
    ShuttingDown = "Buddy is shutting down the PC!"
    Suspending = "Buddy is suspending the PC!"
    Pairing = "MoonDeck/Buddy is pairing!"
    NotPaired = "MoonDeck/Buddy needs pairing!"
    Offline = "Buddy is offline!"


class PairingResult(Enum):
    AlreadyPaired = "Deck is already paired with Buddy!"
    BuddyRefused = "Buddy refused to start pairing. Check the logs on host!"
    Failed = "Failed to start pairing with Buddy!"


class AbortPairingResult(Enum):
    BuddyRefused = "Buddy refused to abort pairing. Check the logs on host!"
    Failed = "Failed to abort pairing with Buddy!"


class CloseSteamResult(Enum):
    BuddyRefused = "Buddy refused to close Steam. Check the logs on host!"
    Failed = "Failed to close Steam via Buddy!"


class ChangePcStateResult(Enum):
    BuddyRefused = "Buddy refused to change PC state. Check the logs on host!"
    Failed = "Failed to change PC state via Buddy!"


class LaunchSteamAppResult(Enum):
    BuddyRefused = "Buddy refused to launch Steam app. Check the logs on host!"
    Failed = "Failed to launch Steam app via Buddy!"


class ChangeResolutionResult(Enum):
    BuddyRefused = "Buddy refused to change resolution. Check the logs on host!"
    Failed = "Failed to change resolution via Buddy!"


class GetHostInfoResult(Enum):
    Failed = "Failed to get host info via Buddy!"


class BuddyClient(contextlib.AbstractAsyncContextManager):

    def __init__(self, address: str, port: int, client_id: str, timeout: float) -> None:
        super().__init__()
        self.address = address
        self.port = port
        self.client_id = client_id
        self.timeout = timeout
        self.__requests: Optional[BuddyRequests] = None
        self.__hello_was_ok = False

    async def __aenter__(self):
        self.__requests = await BuddyRequests(self.address, self.port, self.client_id, self.timeout).__aenter__()
        return self

    async def __aexit__(self, *args):
        requests = self.__requests
        self.__requests = None
        return await requests.__aexit__(*args)

    async def _try_request(self, request, fallback_value):
        try:
            return await request
        except asyncio.TimeoutError as e:
            logger.debug(f"Timeout while executing request: {e}")
            return fallback_value
        except aiohttp.ClientSSLError as e:
            logger.debug(f"Request failed: SSL Verification: {e}")
            return HelloResult.SslVerificationFailed
        except (aiohttp.ServerConnectionError, aiohttp.ClientConnectorError) as e:
            logger.debug(f"Connection error while executing request: {e}")
            return fallback_value
        except aiohttp.ClientError as e:
            logger.exception(f"Client error while executing request")
            return HelloResult.Exception
        except Exception as e:
            logger.exception("Request failed: unknown expection raised.")
            return HelloResult.Exception

    async def say_hello(self):
        async def request():
            resp = await self.__requests.get_api_version()
            if resp["version"] != constants.BUDDY_API_VERSION:
                return HelloResult.VersionMismatch

            resp = await self.__requests.get_pairing_state()
            if resp["state"] == PairingState.NotPaired:
                return HelloResult.NotPaired
            elif resp["state"] == PairingState.Pairing:
                return HelloResult.Pairing

            resp = await self.__requests.get_pc_state()
            if resp["state"] == PcState.Restarting:
                return HelloResult.Restarting
            elif resp["state"] == PcState.ShuttingDown:
                return HelloResult.ShuttingDown
            elif resp["state"] == PcState.Suspending:
                return HelloResult.Suspending
            
            return None

        if self.__hello_was_ok:
            return

        result = await self._try_request(request(), HelloResult.Offline)
        if not result:
            self.__hello_was_ok = True

        return result

    async def start_pairing(self, pin: int):
        async def request():
            result = await self.say_hello()
            if not result:
                return PairingResult.AlreadyPaired
            elif result != HelloResult.NotPaired:
                return result

            resp = await self.__requests.post_start_pairing(pin)
            if not resp["result"]:
                return PairingResult.BuddyRefused

            return None

        return await self._try_request(request(), PairingResult.Failed)

    async def abort_pairing(self):
        async def request():
            result = await self.say_hello()
            if not result:
                return None
            elif result != HelloResult.Pairing:
                return result

            resp = await self.__requests.post_abort_pairing()
            if not resp["result"]:
                return AbortPairingResult.BuddyRefused

            return None

        return await self._try_request(request(), AbortPairingResult.Failed)

    async def launch_app(self, app_id: int):
        async def request():
            result = await self.say_hello()
            if result:
                return result

            resp = await self.__requests.post_launch_steam_app(app_id)
            if not resp["result"]:
                return LaunchSteamAppResult.BuddyRefused

            return None

        return await self._try_request(request(), LaunchSteamAppResult.Failed)

    async def close_steam(self, grace_period: Optional[int]):
        async def request():
            result = await self.say_hello()
            if result:
                return result

            resp = await self.__requests.post_close_steam(grace_period)
            if not resp["result"]:
                return CloseSteamResult.BuddyRefused

            return None

        return await self._try_request(request(), CloseSteamResult.Failed)

    async def change_pc_state(self, state: PcStateChange, grace_period: int):
        async def request():
            result = await self.say_hello()
            if result:
                return result

            resp = await self.__requests.post_change_pc_state(state, grace_period)
            if not resp["result"]:
                return ChangePcStateResult.BuddyRefused

            return None

        return await self._try_request(request(), ChangePcStateResult.Failed)

    async def change_resolution(self, width: int, height: int):
        async def request():
            result = await self.say_hello()
            if result:
                return result

            resp = await self.__requests.post_change_resolution(width, height)
            if not resp["result"]:
                return ChangeResolutionResult.BuddyRefused

            return None

        return await self._try_request(request(), ChangeResolutionResult.Failed)

    async def get_host_info(self):
        async def request():
            result = await self.say_hello()
            if result:
                return result

            return await self.__requests.get_host_info()

        return await self._try_request(request(), GetHostInfoResult.Failed)
