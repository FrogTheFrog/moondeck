import pathlib
import uuid
import copy
import json
from . import constants
from . import utils

from typing import Any, Dict, Literal, Optional, TypedDict
from .logger import logger


class HostResolution(TypedDict):
    automatic: bool
    earlyChangeEnabled: bool
    passToMoonlight: bool
    useCustomDimensions: bool
    customWidth: int
    customHeight: int


class HostSettings(TypedDict):
    buddyPort: int
    address: str
    hostName: str
    mac: str
    resolution: HostResolution


class GameSessionSettings(TypedDict):
    autoApplyAppId: bool
    resumeAfterSuspend: bool


class ButtonPositionSettings(TypedDict):
    horizontalAlignment: Literal["top", "bottom"]
    verticalAlignment: Literal["left", "right"]
    offsetX: str
    offsetY: str
    offsetForHltb: bool


class ButtonStyleSettings(TypedDict):
    showFocusRing: bool
    theme: Literal["HighContrast", "Clean"]


class UserSettings(TypedDict):
    version: constants.CONFIG_VERSION
    clientId: str
    currentHostId: Optional[str]
    gameSession: GameSessionSettings
    buttonPosition: ButtonPositionSettings
    buttonStyle: ButtonStyleSettings
    hostSettings: Dict[str, HostSettings]


class SettingsManager:
    async def get(self):
        settings: Optional[UserSettings] = None
        try:
            with open(f"{constants.CONFIG_DIR}/{constants.CONFIG_FILENAME}", "r") as file:
                data: Dict[str, Any] = json.load(file)
                try:
                    settings = utils.from_dict(UserSettings, data)
                except Exception:
                    try:
                        if not settings:
                            settings = utils.from_dict(UserSettings, self._migrate_settings(data))
                            await self.set(settings)
                    except Exception:
                        logger.exception("failed to parse user settings")
                        

        except FileNotFoundError:
            pass
        except Exception:
            logger.exception("failed to load settings")
            pass

        if settings:
            return settings
        else:
            return await self.set(utils.from_dict(UserSettings, {
                "version": constants.CONFIG_VERSION,
                "clientId": str(uuid.uuid4()),
                "currentHostId": None,
                "gameSession": {
                    "autoApplyAppId": False,
                    "resumeAfterSuspend": False
                },
                "buttonPosition": {
                    "horizontalAlignment": "bottom",
                    "verticalAlignment": "right",
                    "offsetX": "",
                    "offsetY": "",
                    "offsetForHltb": False
                },
                "buttonStyle": {
                    "showFocusRing": True,
                    "theme": "HighContrast"
                },
                "hostSettings": {}}))

    async def set(self, settings: UserSettings):
        try:
            pathlib.Path(constants.CONFIG_DIR).mkdir(
                parents=True, exist_ok=True)
            with open(f"{constants.CONFIG_DIR}/{constants.CONFIG_FILENAME}", "w") as file:
                json.dump(settings, file,
                          ensure_ascii=False, allow_nan=False,
                          indent=4)
        except Exception:
            logger.exception("failed to save settings")

        self.__data = copy.deepcopy(settings)
        return copy.deepcopy(self.__data)

    @staticmethod
    def _migrate_settings(data: Dict[str, Any]) -> Dict[str, Any]:
        if data["version"] == 1:
            data["version"] = 2
            for host in data["hostSettings"].keys():
                data["hostSettings"][host]["resolution"] = {
                    "automatic": True,
                    "earlyChangeEnabled": True,
                    "passToMoonlight": True,
                    "useCustomDimensions": False,
                    "customWidth": 1280,
                    "customHeight": 800
                }

        return data


settings_manager = SettingsManager()
