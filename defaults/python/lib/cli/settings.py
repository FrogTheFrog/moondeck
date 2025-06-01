import uuid

from typing import Dict, Literal, Optional, TypedDict, get_args
from ..settingsmanager import SettingsManager


class HostSettings(TypedDict):
    hostInfoPort: int
    address: str
    staticAddress: bool
    hostName: str
    mac: str


class CmdSettings(TypedDict):
    version: Literal[1]
    clientId: str
    currentHostId: Optional[str]
    hostSettings: Dict[str, HostSettings]


class CmdSettingsManager(SettingsManager[CmdSettings]):
    def _default_settings(self):
        return CmdSettings({
            "version": get_args(CmdSettings.__annotations__["version"])[0],
            "clientId": str(uuid.uuid4()),
            "currentHostId": None,
            "hostSettings": {}
        })

    def _migrate_settings(self, data: dict):
        pass
