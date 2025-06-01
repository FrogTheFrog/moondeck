import uuid

from typing import Dict, Literal, Optional, TypedDict, get_args
from ..settingsmanager import SettingsManager


class HostSettings(TypedDict):
    address: str
    manualAddress: bool
    infoPort: int
    buddyPort: Optional[int]
    hostName: str
    mac: Optional[str]


class CliSettings(TypedDict):
    version: Literal[1]
    clientId: str
    defaultHost: Optional[str]
    hosts: Dict[str, HostSettings]


class CliSettingsManager(SettingsManager[CliSettings]):
    def _default_settings(self):
        return CliSettings({
            "version": get_args(CliSettings.__annotations__["version"])[0],
            "clientId": str(uuid.uuid4()),
            "defaultHost": None,
            "hosts": {}
        })

    def _migrate_settings(self, data: dict):
        pass
