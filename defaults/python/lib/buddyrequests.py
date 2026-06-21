import contextlib
from . import utils
from .logger import logger

from typing import Any, AsyncGenerator, List, Literal, Optional, Type, TypedDict, overload
from enum import Enum


class PairingState(Enum):
    Paired = 0
    Pairing = 1
    NotPaired = 2


class PcState(Enum):
    Normal = 0
    Restarting = 1
    ShuttingDown = 2
    Suspending = 3
    Transient = 4


class PcStateChange(Enum):
    Restart = 0
    Shutdown = 1
    Suspend = 2


class StreamState(Enum):
    NotStreaming = 0
    Streaming = 1
    StreamEnding = 2


class AppState(Enum):
    Stopped = 0
    Running = 1
    Updating = 2


class SteamUiMode(Enum):
    Unknown = 0
    Desktop = 1
    BigPicture = 2


class NonSteamAppDataItem(TypedDict):
    app_id: str
    app_name: str


class StreamedAppData(TypedDict):
    app_id: str
    app_state: AppState


class AppData(TypedDict):
    app_id: str
    app_state: AppState


class UserData(TypedDict):
    id: Optional[str]


class ApiVersionResponse(TypedDict):
    version: int


class PairingStateResponse(TypedDict):
    state: PairingState


class PcStateResponse(TypedDict):
    state: PcState


class ResultLikeResponse(TypedDict):
    result: bool


class GameStreamAppNamesResponse(TypedDict):
    app_names: Optional[List[str]]


class NonSteamAppDataResponse(TypedDict):
    data: Optional[List[NonSteamAppDataItem]]


class CurrentUserResponse(TypedDict):
    user: Optional[UserData]


class StreamStateResponse(TypedDict):
    state: StreamState


class StreamedAppDataResponse(TypedDict):
    data: Optional[StreamedAppData]


class AppDataResponse(TypedDict):
    data: Optional[AppData]


class SteamUiModeResponse(TypedDict):
    mode: SteamUiMode


OsType = Literal["Windows", "Linux", "Other"]
class HostInfoResponse(TypedDict):
    mac: str
    os: OsType


class NotifyOnChangesResult(Enum):
    BuddyRefused = "Buddy refused to notify on changes!"
    UnexpectedMessageType = "Unexpected WebSocket message type!"
    WebSocketClosed = "WebSocket was closed!"


class BuddyException(Exception):
    def __init__(self, result: Enum):
        super().__init__(result.value)
        self.result = result


class BuddyRequests(contextlib.AbstractAsyncContextManager):

    def __init__(self, address: str, port: int, client_id: str, timeout: float) -> None:
        super().__init__()
        
        # Lazy import to improve CLI performance
        import aiohttp
        import base64
        import pathlib
        import ssl

        headers = {"authorization": f"basic {base64.b64encode(client_id.encode('utf-8')).decode('utf-8')}"}
        cafile = str(pathlib.Path(__file__).parent.joinpath("..", "ssl", "moondeck_cert.pem").resolve())
        ssl_context = ssl.create_default_context(ssl.Purpose.SERVER_AUTH, cafile=cafile)
        ssl_context.check_hostname = False
        connector = aiohttp.TCPConnector(ssl=ssl_context)

        self.base_url = f"https://{address}:{port}"
        self.client_id = client_id
        self.__session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=0.1 if timeout <= 0 else timeout), 
            raise_for_status=True, 
            headers=headers,
            connector=connector
        )

    async def __aenter__(self):
        await self.__session.__aenter__()
        return self

    async def __aexit__(self, *args):
        return await self.__session.__aexit__(*args)

    async def get_api_version(self):
        async with self.__session.get(f"{self.base_url}/apiVersion") as resp:
            data = await resp.json(encoding="utf-8")
            return utils.from_dict(ApiVersionResponse, data)

    async def get_pairing_state(self):
        async with self.__session.get(f"{self.base_url}/pairingState/{self.client_id}") as resp:
            data = await resp.json(encoding="utf-8")
            return utils.from_dict(PairingStateResponse, data)

    async def post_start_pairing(self, pin: int):
        # Lazy import to improve CLI performance
        import base64

        data = {
            "id": self.client_id,
            "hashed_id": base64.b64encode((self.client_id + str(pin)).encode("utf-8")).decode("utf-8")
        }

        async with self.__session.post(f"{self.base_url}/pair", json=data) as resp:
            data = await resp.json(encoding="utf-8")
            return utils.from_dict(ResultLikeResponse, data)

    async def post_abort_pairing(self):
        data = {
            "id": self.client_id
        }

        async with self.__session.post(f"{self.base_url}/abortPairing", json=data) as resp:
            data = await resp.json(encoding="utf-8")
            return utils.from_dict(ResultLikeResponse, data)

    async def get_steam_ui_mode(self):
        async with self.__session.get(f"{self.base_url}/steamUiMode") as resp:
            data = await resp.json(encoding="utf-8")
            return utils.from_dict(SteamUiModeResponse, data)

    async def post_launch_steam(self, big_picture_mode: bool, username: Optional[str]):
        data = {
            "big_picture_mode": big_picture_mode,
            "username": username
        }

        async with self.__session.post(f"{self.base_url}/launchSteam", json=data) as resp:
            data = await resp.json(encoding="utf-8")
            return utils.from_dict(ResultLikeResponse, data)

    async def post_launch_steam_app(self, app_id: str):
        data = {
            "app_id": app_id
        }

        async with self.__session.post(f"{self.base_url}/launchSteamApp", json=data) as resp:
            data = await resp.json(encoding="utf-8")
            return utils.from_dict(ResultLikeResponse, data)

    async def post_close_steam(self, keep_stream_alive: bool):
        data = {
            "keep_stream_alive": keep_stream_alive
        }

        async with self.__session.post(f"{self.base_url}/closeSteam", json=data) as resp:
            data = await resp.json(encoding="utf-8")
            return utils.from_dict(ResultLikeResponse, data)
        
    async def post_close_steam_big_picture_mode(self):
        async with self.__session.post(f"{self.base_url}/closeSteamBigPictureMode") as resp:
            data = await resp.json(encoding="utf-8")
            return utils.from_dict(ResultLikeResponse, data)

    async def get_pc_state(self):
        async with self.__session.get(f"{self.base_url}/pcState") as resp:
            data = await resp.json(encoding="utf-8")
            return utils.from_dict(PcStateResponse, data)

    async def post_change_pc_state(self, state: PcStateChange, delay_s: int):
        data = {
            "state": state.name,
            "delay": delay_s
        }

        async with self.__session.post(f"{self.base_url}/changePcState", json=data) as resp:
            data = await resp.json(encoding="utf-8")
            return utils.from_dict(ResultLikeResponse, data)

    async def get_host_info(self):
        async with self.__session.get(f"{self.base_url}/hostInfo") as resp:
            data = await resp.json(encoding="utf-8")
            return utils.from_dict(HostInfoResponse, data)
        
    async def get_stream_state(self):
        async with self.__session.get(f"{self.base_url}/streamState") as resp:
            data = await resp.json(encoding="utf-8")
            return utils.from_dict(StreamStateResponse, data)

    async def get_streamed_app_data(self):
        async with self.__session.get(f"{self.base_url}/streamedAppData") as resp:
            data = await resp.json(encoding="utf-8")
            return utils.from_dict(StreamedAppDataResponse, data)
        
    async def get_app_data(self, app_id: str):
        data = {
            "app_id": app_id
        }

        async with self.__session.get(f"{self.base_url}/appData", json=data) as resp:
            data = await resp.json(encoding="utf-8")
            return utils.from_dict(AppDataResponse, data)
        
    async def post_clear_streamed_app_data(self):
        async with self.__session.post(f"{self.base_url}/clearStreamedAppData") as resp:
            data = await resp.json(encoding="utf-8")
            return utils.from_dict(ResultLikeResponse, data)

    async def post_end_stream(self):
        async with self.__session.post(f"{self.base_url}/endStream") as resp:
            data = await resp.json(encoding="utf-8")
            return utils.from_dict(ResultLikeResponse, data)
    
    async def get_game_stream_app_names(self):
        async with self.__session.get(f"{self.base_url}/gameStreamAppNames") as resp:
            data = await resp.json(encoding="utf-8")
            return utils.from_dict(GameStreamAppNamesResponse, data)

    async def get_non_steam_app_data(self, user_id: str):
        data = {
            "user_id": user_id
        }

        async with self.__session.get(f"{self.base_url}/nonSteamAppData", json=data) as resp:
            data = await resp.json(encoding="utf-8")
            return utils.from_dict(NonSteamAppDataResponse, data)
        
    async def get_current_user(self):
        async with self.__session.get(f"{self.base_url}/currentUser") as resp:
            data = await resp.json(encoding="utf-8")
            return utils.from_dict(CurrentUserResponse, data)
        
    @overload
    def notify_on_changes(self, t1: Type[utils.T1], /) -> AsyncGenerator[tuple[utils.T1], None]: ...
    @overload
    def notify_on_changes(self, t1: Type[utils.T1], t2: Type[utils.T2], /) -> AsyncGenerator[tuple[utils.T1, utils.T2], None]: ...
    @overload
    def notify_on_changes(self, t1: Type[utils.T1], t2: Type[utils.T2], t3: Type[utils.T3], /) -> AsyncGenerator[tuple[utils.T1, utils.T2, utils.T3], None]: ...
    async def notify_on_changes(self, *topic_types: Type[Any]) -> AsyncGenerator[tuple[Any, ...], None]:
        # Lazy import to improve CLI performance
        import aiohttp

        topic_mapping = {
            StreamedAppDataResponse: "StreamedAppData",
            SteamUiModeResponse: "SteamUiMode",
            CurrentUserResponse: "CurrentUser",
            StreamStateResponse: "StreamState",
        }
        topics = [topic_mapping[topic_type] for topic_type in topic_types]

        async with self.__session.ws_connect(f"{self.base_url}/notifyOnChanges") as ws:
            await ws.send_json(topics)
            response = utils.from_dict(ResultLikeResponse, await ws.receive_json())

            if not response["result"]:
                raise BuddyException(NotifyOnChangesResult.BuddyRefused)

            async for msg in ws:
                if msg.type == aiohttp.WSMsgType.TEXT:
                    items = msg.json()
                    yield tuple(utils.from_dict(topic_type, item) for topic_type, item in zip(topic_types, items))
                else:
                    logger.error(f"Unexpected WebSocket message: {msg}")
                    raise BuddyException(NotifyOnChangesResult.UnexpectedMessageType)

            if ws.closed:
                raise BuddyException(NotifyOnChangesResult.WebSocketClosed)
