import contextlib
from . import constants

from enum import Enum
from typing import Any, AsyncGenerator, Awaitable, Type, overload
from .buddyrequests import BuddyRequests, PairingState, PcState, BuddyException
from .utils import T, T1, T2, T3


class HelloResult(Enum):
    SslVerificationFailed = "SSL certificate could not be verified!"
    VersionMismatch = "MoonDeck/Buddy needs update!"
    Restarting = "Buddy is restarting the PC!"
    ShuttingDown = "Buddy is shutting down the PC!"
    Suspending = "Buddy is suspending the PC!"
    Hibernating = "Buddy is hibernating the PC!"
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


class CloseSteamBigPictureModeResult(Enum):
    BuddyRefused = "Buddy refused to close BPM. Check the logs on host!"
    Failed = "Failed to close BPM via Buddy!"


class RestartHostResult(Enum):
    BuddyRefused = "Buddy refused to restart host. Check the logs on host!"
    Failed = "Failed to restart host via Buddy!"


class ShutdownHostResult(Enum):
    BuddyRefused = "Buddy refused to shutdown host. Check the logs on host!"
    Failed = "Failed to shutdown host via Buddy!"


class SuspendHostResult(Enum):
    BuddyRefused = "Buddy refused to suspend host. Check the logs on host!"
    Failed = "Failed to suspend host via Buddy!"


class HibernateHostResult(Enum):
    BuddyRefused = "Buddy refused to hibernate host. Check the logs on host!"
    Failed = "Failed to hibernate host via Buddy!"


class AbortHostStateChangeResult(Enum):
    BuddyRefused = "Buddy refused to abort host state change. Check the logs on host!"
    Failed = "Failed to abort host state change via Buddy!"


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


class GetGameStreamAppNamesResult(Enum):
    Failed = "Failed to get GameStream app names via Buddy!"


class GetNonSteamAppDataResult(Enum):
    Failed = "Failed to get non-Steam app data via Buddy!"


class GetCurrentUserResult(Enum):
    Failed = "Failed to get current user id via Buddy!"


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
        # Lazy import to improve CLI performance
        import asyncio
        import aiohttp

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
            elif resp["state"] == PcState.Hibernating:
                raise BuddyException(HelloResult.Hibernating)
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

    async def launch_steam(self, big_picture_mode: bool, username: str | None):
        async def request():
            await self.say_hello()
            resp = await self.__requests.post_launch_steam(big_picture_mode, username)
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

    async def close_steam(self, keep_stream_alive: bool = False):
        async def request():
            await self.say_hello()
            resp = await self.__requests.post_close_steam(keep_stream_alive)
            if not resp["result"]:
                raise BuddyException(CloseSteamResult.BuddyRefused)

        return await self._try_request(request(), CloseSteamResult.Failed)
    
    async def close_steam_big_picture_mode(self):
        async def request():
            await self.say_hello()
            resp = await self.__requests.post_close_steam_big_picture_mode()
            if not resp["result"]:
                raise BuddyException(CloseSteamBigPictureModeResult.BuddyRefused)

        return await self._try_request(request(), CloseSteamBigPictureModeResult.Failed)

    async def restart_host(self, delay_s: int):
        async def request():
            await self.say_hello()
            resp = await self.__requests.post_restart_host(delay_s)
            if not resp["result"]:
                raise BuddyException(RestartHostResult.BuddyRefused)

        return await self._try_request(request(), RestartHostResult.Failed)
    
    async def shutdown_host(self, delay_s: int):
        async def request():
            await self.say_hello()
            resp = await self.__requests.post_shutdown_host(delay_s)
            if not resp["result"]:
                raise BuddyException(ShutdownHostResult.BuddyRefused)

        return await self._try_request(request(), ShutdownHostResult.Failed)
    
    async def suspend_host(self, delay_s: int):
        async def request():
            await self.say_hello()
            resp = await self.__requests.post_suspend_host(delay_s)
            if not resp["result"]:
                raise BuddyException(SuspendHostResult.BuddyRefused)

        return await self._try_request(request(), SuspendHostResult.Failed)
    
    async def hibernate_host(self, delay_s: int):
        async def request():
            await self.say_hello()
            resp = await self.__requests.post_hibernate_host(delay_s)
            if not resp["result"]:
                raise BuddyException(HibernateHostResult.BuddyRefused)

        return await self._try_request(request(), HibernateHostResult.Failed)
    
    async def abort_host_state_change(self):
        async def request():
            try:
                await self.say_hello()
                return  # Buddy is in an "online" state, skip the request
            except BuddyException as err:
                valid_states = [HelloResult.Restarting, HelloResult.ShuttingDown, HelloResult.Suspending, HelloResult.Hibernating]
                if err.result not in valid_states:
                    raise err

            resp = await self.__requests.post_abort_host_state_change()
            if not resp["result"]:
                raise BuddyException(AbortHostStateChangeResult.BuddyRefused)

        return await self._try_request(request(), AbortHostStateChangeResult.Failed)

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
    
    async def get_game_stream_app_names(self):
        async def request():
            await self.say_hello()
            resp = await self.__requests.get_game_stream_app_names()
            return resp["app_names"]

        return await self._try_request(request(), GetGameStreamAppNamesResult.Failed)

    async def get_non_steam_app_data(self, user_id: str):
        async def request():
            await self.say_hello()
            resp = await self.__requests.get_non_steam_app_data(user_id=user_id)
            return resp["data"]

        return await self._try_request(request(), GetNonSteamAppDataResult.Failed)
    
    async def get_current_user(self):
        async def request():
            await self.say_hello()
            return await self.__requests.get_current_user()

        return await self._try_request(request(), GetCurrentUserResult.Failed)
    
    @overload
    async def notify_on_changes(self, t1: Type[T1], /) -> AsyncGenerator[tuple[T1], None]: ...
    @overload
    async def notify_on_changes(self, t1: Type[T1], t2: Type[T2], /) -> AsyncGenerator[tuple[T1, T2], None]: ...
    @overload
    async def notify_on_changes(self, t1: Type[T1], t2: Type[T2], t3: Type[T3], /) -> AsyncGenerator[tuple[T1, T2, T3], None]: ...
    async def notify_on_changes(self, *topic_types: Type[Any]) -> AsyncGenerator[tuple[Any, ...], None]:
        await self.say_hello()
        return self.__requests.notify_on_changes(*topic_types)
