from typing import Optional
from . import constants

from base64 import b64encode
from enum import Enum


class ControlType(Enum):
    Steam = "STEAM"
    PC = "PC"


def HelloMsg():
    return {"type": "HELLO", "version": constants.MSG_VERSION}


def LoginMsg(control_type: ControlType, client_id: str):
    return {"type": "LOGIN", "control_type": control_type.value, "id": client_id}


def PairStatus(client_id: str):
    return {"type": "PAIR_STATUS", "id": client_id}


def PairMsg(client_id: str, pin: int):
    hashed_id = b64encode(
        (client_id + str(pin)).encode("utf-8")).decode("utf-8")
    return {"type": "PAIR", "id": client_id, "hashed_id": hashed_id}


def AbortPairingMsg(client_id: str):
    return {"type": "ABORT_PAIRING", "id": client_id}


def LaunchAppMsg(app_id: int):
    return {"type": "LAUNCH_APP", "app_id": app_id}


def SteamStatusMsg():
    return {"type": "STEAM_STATUS"}


def PcStateMsg():
    return {"type": "PC_STATE"}


def RestartPcMsg(grace_period: int = 10):
    return {"type": "RESTART_PC", "grace_period": grace_period}


def ShutdownPcMsg(grace_period: int = 10):
    return {"type": "SHUTDOWN_PC", "grace_period": grace_period}


def CloseSteamMsg(grace_period: Optional[int] = None):
    return {"type": "CLOSE_STEAM", "grace_period": grace_period}


def ChangeResolutionMsg(width: int, height: int, immediate: bool):
    return {"type": "CHANGE_RESOLUTION", "width": width, "height": height, "immediate": immediate}
