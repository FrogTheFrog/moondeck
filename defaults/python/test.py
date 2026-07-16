# autopep8: off
# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
def add_plugin_to_path():
    import sys
    from pathlib import Path

    script_dir = Path(__file__).parent.resolve()
    directories = [["lib"], ["externals"]]
    for dir in directories:
        sys.path.append(str(script_dir.joinpath(*dir)))

add_plugin_to_path()
# <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
# autopep8: on  

import asyncio
import logging

from lib.buddyrequests import BuddyException
from lib.runner.moondeckapprunner import MoonDeckAppRunner
from lib.runner.moonlightonlyrunner import MoonlightOnlyRunner
from lib.logger import logger, set_logger_settings
from lib.utils import is_moondeck_runner_ready, change_moondeck_runner_suspended_state, acquire_runner_pid_lock
from lib.runner.settingsparser import MoonDeckAppRunnerSettings, MoonlightOnlyRunnerSettings, parse_settings, RunnerType

import lib.constants as constants
from lib.splashscreen.splashscreen import SplashScreen
from lib.splashscreen.mainscreen import MainScreenRunning, MainScreenSuspended
from lib.splashscreen.wolscreen import WolScreen


async def main():
    async with SplashScreen() as screen:
        async with WolScreen(screen.canvas, "FrogStation FrogStation FrogStation FrogStation FrogStation FrogStation FrogStation", False, False) as wol:
            await asyncio.sleep(5)
            wol.set_status(None, True)
            await asyncio.sleep(5)
            wol.set_status(True, None)
            await asyncio.sleep(5)
            wol.set_status(None, None)
            await asyncio.sleep(5)


if __name__ == "__main__":
    asyncio.run(main())
