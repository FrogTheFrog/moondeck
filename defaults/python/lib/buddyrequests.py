import aiohttp
import base64
import contextlib
import pathlib
import ssl
from . import utils

from typing import List, Literal, Optional, TypedDict
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


class ApiVersionResponse(TypedDict):
    version: int


class PairingStateResponse(TypedDict):
    state: PairingState


class PcStateResponse(TypedDict):
    state: PcState


class ResultLikeResponse(TypedDict):
    result: bool


class GameStreamAppNamesResponse(TypedDict):
    appNames: Optional[List[str]]


class NonSteamAppDataResponse(TypedDict):
    data: Optional[List[NonSteamAppDataItem]]


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


class BuddyRequests(contextlib.AbstractAsyncContextManager):

    def __init__(self, address: str, port: int, client_id: str, timeout: float) -> None:
        super().__init__()
        
        headers = {"authorization": f"basic {base64.b64encode(client_id.encode('utf-8')).decode('utf-8')}"}
        cafile = str(pathlib.Path(__file__).parent.resolve().joinpath("..", "ssl", "moondeck_cert.pem"))
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

    async def post_launch_steam(self, big_picture_mode: bool):
        data = {
            "big_picture_mode": big_picture_mode
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

    async def post_close_steam(self):
        async with self.__session.post(f"{self.base_url}/closeSteam") as resp:
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
        
    async def get_non_steam_app_data(self, user_id: str):
        data = {
            "user_id": user_id
        }

        async with self.__session.get(f"{self.base_url}/nonSteamAppData", json=data) as resp:
            data = await resp.json(encoding="utf-8")
            return utils.from_dict(NonSteamAppDataResponse, data)
