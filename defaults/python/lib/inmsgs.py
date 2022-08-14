from typing import Any, Dict, Literal, Optional


class UnexpectedMessage(Exception):
    def __init__(self, resp: Any, message: str):
        self.resp = resp
        self.message = message
        super().__init__(self.message)


class BaseIncommingMessage:
    def __repr__(self) -> str:
        return f"{type(self).__name__}()"


class InvalidMessage(BaseIncommingMessage):
    @staticmethod
    def from_json(resp: Dict[str, Any]):
        if resp.get("type") == "INVALID_MESSAGE":
            return InvalidMessage()


class MessageAccepted(BaseIncommingMessage):
    @staticmethod
    def from_json(resp: Dict[str, Any]):
        if resp.get("type") == "MESSAGE_ACCEPTED":
            return MessageAccepted()


class ControlTypeTaken(BaseIncommingMessage):
    @staticmethod
    def from_json(resp: Dict[str, Any]):
        if resp.get("type") == "CONTROL_TYPE_TAKEN":
            return ControlTypeTaken()


class Paired(BaseIncommingMessage):
    @staticmethod
    def from_json(resp: Dict[str, Any]):
        if resp.get("type") == "PAIRED":
            return Paired()


class Pairing(BaseIncommingMessage):
    @staticmethod
    def from_json(resp: Dict[str, Any]):
        if resp.get("type") == "PAIRING":
            return Pairing()


class NotPaired(BaseIncommingMessage):
    @staticmethod
    def from_json(resp: Dict[str, Any]):
        if resp.get("type") == "NOT_PAIRED":
            return NotPaired()


class VersionMismatch(BaseIncommingMessage):
    def __init__(self, version: int) -> None:
        self.version = version

    def __repr__(self) -> str:
        return f"{type(self).__name__}(version={self.version})"

    @staticmethod
    def from_json(resp: Dict[str, Any]):
        if resp.get("type") == "VERSION_MISMATCH" and "version" in resp:
            return VersionMismatch(version=resp.get("version"))


class SteamStatus(BaseIncommingMessage):
    def __init__(self, running_app_id: int, steam_is_running: bool, last_launched_app_is_updating: Optional[int]) -> None:
        self.running_app_id = running_app_id
        self.steam_is_running = steam_is_running
        self.last_launched_app_is_updating = last_launched_app_is_updating

    def __repr__(self) -> str:
        return f"{type(self).__name__}(running_app_id={self.running_app_id}, steam_is_running={self.steam_is_running}, last_launched_app_is_updating={self.last_launched_app_is_updating})"

    @staticmethod
    def from_json(resp: Dict[str, Any]):
        if resp.get("type") == "STEAM_STATUS" and "running_app_id" in resp and "steam_is_running" in resp and "last_launched_app_is_updating" in resp:
            return SteamStatus(running_app_id=resp.get("running_app_id"), steam_is_running=resp.get("steam_is_running"), last_launched_app_is_updating=resp.get("last_launched_app_is_updating"))


class PcState(BaseIncommingMessage):
    possible_states = ["Normal", "Restarting", "ShuttingDown"]

    def __init__(self, pc_state: Literal["Normal", "Restarting", "ShuttingDown"]) -> None:
        self.pc_state = pc_state

    def __repr__(self) -> str:
        return f"{type(self).__name__}(pc_state={self.pc_state})"

    @staticmethod
    def from_json(resp: Dict[str, Any]):
        if resp.get("type") == "PC_STATE" and "pc_state" in resp and resp.get("pc_state") in PcState.possible_states:
            return PcState(pc_state=resp.get("pc_state"))


@staticmethod
def convertFromJson(resp: Dict[str, Any], types=None):
    if types is None:
        types = [InvalidMessage, MessageAccepted, ControlTypeTaken, Paired,
                 NotPaired, Pairing, VersionMismatch, SteamStatus, PcState]

    for msg_type in types:
        msg = msg_type.from_json(resp)
        if msg is not None:
            return msg
