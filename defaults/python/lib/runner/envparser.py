import os

from enum import Enum
from typing import Optional, TypedDict
from ..logger import logger


class RunnerType(Enum):
    MoonDeck = 0
    MoonlightOnly = 1


class MoonDeckResolution(TypedDict):
    width: int
    height: int


class EnvSettings(TypedDict):
    auto_resolution: Optional[MoonDeckResolution]
    linked_display: Optional[str]
    app_id: Optional[int]
    app_name: Optional[str]
    runner_type: Optional[RunnerType]


def get_auto_resolution() -> Optional[MoonDeckResolution]:
    value = os.environ.get("MOONDECK_AUTO_RES")
    try:
        if value is None:
            return None
        
        value = str(value).split("x")
        return { "width": int(value[0]), "height": int(value[1]) }
    except:
        logger.exception("While getting auto resolution")
        return None
    
def get_linked_display() -> Optional[str]:
    value = os.environ.get("MOONDECK_LINKED_DISPLAY")
    try:
        if value is None:
            return None
        
        return str(value)
    except:
        logger.exception("While getting linked display")
        return None

def get_app_id() -> Optional[int]:
    app_id = os.environ.get("MOONDECK_STEAM_APP_ID")
    try:
        return int(app_id) if app_id is not None else app_id
    except:
        logger.exception("While getting app id")
        return None
    
def get_app_name() -> Optional[str]:
    return os.environ.get("MOONDECK_APP_NAME")

def get_runner_type() -> Optional[RunnerType]:
    app_type = os.environ.get("MOONDECK_APP_TYPE")
    try:
        app_type = int(app_type) if app_type is not None else None
        if app_type == 0 or app_type == 2:
            return RunnerType.MoonDeck
        if app_type == 1:
            return RunnerType.MoonlightOnly
        
        return None
    except:
        logger.exception("While getting app type")
        return None

def parse_env_settings() -> EnvSettings:
    return {
        "auto_resolution": get_auto_resolution(),
        "linked_display": get_linked_display(),
        "app_id": get_app_id(),
        "app_name": get_app_name(),
        "runner_type": get_runner_type()
    }
