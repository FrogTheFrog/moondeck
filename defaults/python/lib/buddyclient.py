import externals.aiohttp as aiohttp
import asyncio
import contextlib
from . import constants

from enum import Enum
from typing import Awaitable
from .buddyrequests import BuddyRequests, PairingState, PcState, PcStateChange
from .utils import T


class HelloResult(Enum):
    SslVerificationFailed = "SSL certificate could not be verified!"
    VersionMismatch = "MoonDeck/Buddy needs update!"
    Restarting = "Buddy is restarting the PC!"
    ShuttingDown = "Buddy is shutting down the PC!"
    Suspending = "Buddy is suspending the PC!"
    Pairing = "MoonDeck/Buddy is already pairing!"
    NotPaired = "MoonDeck/Buddy needs pairing!"
    Offline = "Buddy is offline!"


class PairingResult(Enum):
    AlreadyPaired = "MoonDeck is already paired with Buddy!"
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


class SteamUiModeResult(Enum):
    Failed = "Failed to get Steam UI mode via Buddy!"


class LaunchSteamResult(Enum):
    BuddyRefused = "Buddy refused to launch Steam. Check the logs on host!"
    Failed = "Failed to launch Steam via Buddy!"


class LaunchSteamAppResult(Enum):
    BuddyRefused = "Buddy refused to launch Steam app. Check the logs on host!"
    Failed = "Failed to launch Steam app via Buddy!"


class GetHostInfoResult(Enum):
    Failed = "Failed to get host info via Buddy!"


class GetHostPcInfoResult(Enum):
    Failed = "Failed to get host pc info via Buddy!"


class StreamStateResult(Enum):
    Failed = "Failed to get stream state via Buddy!"


class StreamedAppDataResult(Enum):
    Failed = "Failed to get streamed app data via Buddy!"


class AppDataResult(Enum):
    Failed = "Failed to get app data via Buddy!"


class ClearStreamedAppDataResult(Enum):
    BuddyRefused = "Buddy refused to clear streamed app data. Check the logs on host!"
    Failed = "Failed to clear streamed app data via Buddy!"


class EndStreamResult(Enum):
    BuddyRefused = "Buddy refused to end stream. Check the logs on host!"
    Failed = "Failed to end stream via Buddy!"


class GetNonSteamAppDataResult(Enum):
    Failed = "Failed to get non-Steam app data via Buddy!"


class BuddyException(Exception):
    def __init__(self, result: Enum):
        super().__init__(result.value)
        self.result = result


class BuddyClient(contextlib.AbstractAsyncContextManager):

    def __init__(self, address: str, port: int, client_id: str, timeout: float) -> None:
        super().__init__()
        self.__address = address
        self.__port = port
        self.__requests = BuddyRequests(address, port, client_id, timeout)
        self.__hello_was_ok = False

    @property
    def address(self):
        return self.__address
    
    @property
    def port(self):
        return self.__port
    
    @property
    def hello_was_ok(self):
        return self.__hello_was_ok

    async def __aenter__(self):
        await self.__requests.__aenter__()
        return self

    async def __aexit__(self, *args):
        return await self.__requests.__aexit__(*args)

    async def _try_request(self, request: Awaitable[T], default_error_value: Enum):
        try:
            return await request
        
        except asyncio.TimeoutError as e:
            raise BuddyException(default_error_value)
        except aiohttp.ClientSSLError as e:
            raise BuddyException(HelloResult.SslVerificationFailed)
        except (aiohttp.ServerConnectionError, aiohttp.ClientConnectorError, aiohttp.ClientResponseError) as e:
            raise BuddyException(default_error_value)

    async def say_hello(self, force=False):
        async def request():
            resp = await self.__requests.get_api_version()
            if resp["version"] != constants.BUDDY_API_VERSION:
                raise BuddyException(HelloResult.VersionMismatch)

            resp = await self.__requests.get_pairing_state()
            if resp["state"] == PairingState.NotPaired:
                raise BuddyException(HelloResult.NotPaired)
            elif resp["state"] == PairingState.Pairing:
                raise BuddyException(HelloResult.Pairing)

            resp = await self.__requests.get_pc_state()
            if resp["state"] == PcState.Restarting:
                raise BuddyException(HelloResult.Restarting)
            elif resp["state"] == PcState.ShuttingDown:
                raise BuddyException(HelloResult.ShuttingDown)
            elif resp["state"] == PcState.Suspending:
                raise BuddyException(HelloResult.Suspending)
            elif resp["state"] == PcState.Transient:
                raise BuddyException(HelloResult.Offline)
            
        if self.__hello_was_ok and not force:
            return

        self.__hello_was_ok = False
        await self._try_request(request(), HelloResult.Offline)
        self.__hello_was_ok = True

    async def start_pairing(self, pin: int):
        async def request():
            try:
                await self.say_hello()
                raise BuddyException(PairingResult.AlreadyPaired)
            except BuddyException as err:
                if err.result != HelloResult.NotPaired:
                    raise err

            resp = await self.__requests.post_start_pairing(pin)
            if not resp["result"]:
                raise BuddyException(PairingResult.BuddyRefused)

        return await self._try_request(request(), PairingResult.Failed)

    async def abort_pairing(self):
        async def request():
            try:
                await self.say_hello()
                return  # Already paired, so let's just asume success
            except BuddyException as err:
                if err.result != HelloResult.Pairing:
                    raise err

            resp = await self.__requests.post_abort_pairing()
            if not resp["result"]:
                raise BuddyException(AbortPairingResult.BuddyRefused)

        return await self._try_request(request(), AbortPairingResult.Failed)

    async def get_steam_ui_mode(self):
        async def request():
            await self.say_hello()
            return await self.__requests.get_steam_ui_mode()

        return await self._try_request(request(), SteamUiModeResult.Failed)

    async def launch_steam(self, big_picture_mode: bool):
        async def request():
            await self.say_hello()
            resp = await self.__requests.post_launch_steam(big_picture_mode)
            if not resp["result"]:
                raise BuddyException(LaunchSteamResult.BuddyRefused)

        return await self._try_request(request(), LaunchSteamResult.Failed)

    async def launch_app(self, app_id: str):
        async def request():
            await self.say_hello()
            resp = await self.__requests.post_launch_steam_app(app_id)
            if not resp["result"]:
                raise BuddyException(LaunchSteamAppResult.BuddyRefused)

        return await self._try_request(request(), LaunchSteamAppResult.Failed)

    async def close_steam(self):
        async def request():
            await self.say_hello()
            resp = await self.__requests.post_close_steam()
            if not resp["result"]:
                raise BuddyException(CloseSteamResult.BuddyRefused)

        return await self._try_request(request(), CloseSteamResult.Failed)

    async def change_pc_state(self, state: PcStateChange, delay_s: int):
        async def request():
            await self.say_hello()
            resp = await self.__requests.post_change_pc_state(state, delay_s)
            if not resp["result"]:
                raise BuddyException(ChangePcStateResult.BuddyRefused)

        return await self._try_request(request(), ChangePcStateResult.Failed)

    async def get_host_info(self):
        async def request():
            await self.say_hello()
            return await self.__requests.get_host_info()

        return await self._try_request(request(), GetHostInfoResult.Failed)
    
    async def get_stream_state(self):
        async def request():
            await self.say_hello()
            return await self.__requests.get_stream_state()

        return await self._try_request(request(), StreamStateResult.Failed)
    
    async def get_streamed_app_data(self):
        async def request():
            await self.say_hello()
            return await self.__requests.get_streamed_app_data()

        return await self._try_request(request(), StreamedAppDataResult.Failed)
    
    async def get_app_data(self, app_id: str):
        async def request():
            await self.say_hello()
            return await self.__requests.get_app_data(app_id)

        return await self._try_request(request(), AppDataResult.Failed)
    
    async def clear_streamed_app_data(self):
        async def request():
            await self.say_hello()
            resp = await self.__requests.post_clear_streamed_app_data()
            if not resp["result"]:
                raise BuddyException(ClearStreamedAppDataResult.BuddyRefused)

        return await self._try_request(request(), ClearStreamedAppDataResult.Failed)

    async def end_stream(self):
        async def request():
            await self.say_hello()
            resp = await self.__requests.post_end_stream()
            if not resp["result"]:
                raise BuddyException(EndStreamResult.BuddyRefused)

        return await self._try_request(request(), EndStreamResult.Failed)
    
    async def get_non_steam_app_data(self, user_id: str):
        async def request():
            await self.say_hello()
            resp = await self.__requests.get_non_steam_app_data(user_id=user_id)
            return resp["data"]

        return await self._try_request(request(), GetNonSteamAppDataResult.Failed)
