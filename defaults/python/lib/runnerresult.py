import os
from . import constants

from enum import Enum
from typing import Optional
from .logger import logger


class Result(Enum):
    ClosedPrematurely = "MoonDeck runner closed prematurely!"
    NoAppId = "Failed to parse app id!"
    HostNotSelected = "Host is not selected!"
    Exception = "Unhandled exception!"
    GameStreamDead = "GameStream service not responsing!"
    GameStreamBusy = "GameStream is already streaming!"
    SteamLaunchFailed = "Could not launch Steam!"
    AnotherSteamAppIsRunning = "Another Steam App is running!"
    AppLaunchFailed = "Failed to launch app in time!"
    MoonlightClosed = "Moonlight has been closed!"
    MoonlightIsNotInstalled = "Moonlight's flatpak is not installed!"


def set_result(result: Optional[Enum], log_result=True):
    try:
        if result:
            assert isinstance(result.value, str), f"{result.value} is not a string!"
            with open(constants.RUNNER_RESULT_FILE, "w+") as file:
                file.write(result.value)
                if log_result:
                    logger.error(result.value)
        else:
            if os.path.exists(constants.RUNNER_RESULT_FILE):
                os.remove(constants.RUNNER_RESULT_FILE)
    except Exception:
        logger.exception("Unhandled exception")


def get_result():
    try:
        if os.path.exists(constants.RUNNER_RESULT_FILE):
            with open(constants.RUNNER_RESULT_FILE, "r") as file:
                return file.readline()

        return None
    except Exception:
        logger.exception("Unhandled exception")
        return "Expection while checking result!"
