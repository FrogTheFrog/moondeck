import uuid

from typing import Dict, Literal, Optional, TypedDict, get_args
from ..settingsmanager import SettingsManager


class HostSettings(TypedDict):
    hostInfoPort: int
    address: str
    staticAddress: bool
    hostName: str
    mac: str


class CliSettings(TypedDict):
    version: Literal[1]
    clientId: str
    currentHostId: Optional[str]
    hostSettings: Dict[str, HostSettings]


class CliSettingsManager(SettingsManager[CliSettings]):
    def _default_settings(self):
        return CliSettings({
            "version": get_args(CliSettings.__annotations__["version"])[0],
            "clientId": str(uuid.uuid4()),
            "currentHostId": None,
            "hostSettings": {}
        })

    def _migrate_settings(self, data: dict):
        pass
