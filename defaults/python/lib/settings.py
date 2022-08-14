import pathlib
import uuid
import copy
import json
from . import constants
from . import utils

from typing import Any, Dict, Literal, Optional, TypedDict
from .logger import logger


class HostSettings(TypedDict):
    buddyPort: int
    address: str
    hostName: str
    mac: str


class GameSessionSettings(TypedDict):
    autoApplyAppId: bool
    resumeAfterSuspend: bool


class UserSettings(TypedDict):
    version: Literal[1]
    clientId: str
    currentHostId: Optional[str]
    gameSession: GameSessionSettings
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
                    logger.exception("failed to parse user settings")
                    settings = self._migrate_settings(data)

        except FileNotFoundError:
            pass
        except Exception:
            logger.exception("failed to load settings")
            pass

        if settings:
            return settings
        else:
            return await self.set(utils.from_dict(UserSettings, {
                "version": 1,
                "clientId": str(uuid.uuid4()),
                "currentHostId": None,
                "gameSession": {
                    "autoApplyAppId": False,
                    "resumeAfterSuspend": False
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
    def _migrate_settings(data: Dict[str, Any]) -> Optional[UserSettings]:
        # To be implemented when such a need arises
        return None


settings_manager = SettingsManager()
