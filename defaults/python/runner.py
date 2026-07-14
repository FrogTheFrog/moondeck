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
import contextlib
import signal
import logging

from lib.buddyrequests import BuddyException
from lib.runner.moondeckapprunner import MoonDeckAppRunner
from lib.runner.moonlightonlyrunner import MoonlightOnlyRunner
from lib.logger import logger, set_logger_settings
from lib.utils import is_moondeck_runner_ready, change_moondeck_runner_suspended_state, acquire_runner_pid_lock
from lib.runner.settingsparser import MoonDeckAppRunnerSettings, MoonlightOnlyRunnerSettings, parse_settings, RunnerType
from lib.splashscreen.splashscreen import SplashScreen
from lib.splashscreen.mainscreen import MainScreenRunning, MainScreenSuspended
from lib.splashscreen.overlay import OverlayStack

import lib.constants as constants
import lib.runnerresult as runnerresult


set_logger_settings(logger, constants.RUNNER_LOG_FILE, rotate=False)


async def run_runner(settings: MoonDeckAppRunnerSettings | MoonlightOnlyRunnerSettings, overlay_stack: OverlayStack):
    if settings["runner_type"] == RunnerType.MoonDeck:
        await MoonDeckAppRunner.run(settings, overlay_stack)
    else:
        await MoonlightOnlyRunner.run(settings, overlay_stack)


async def run_with_suspend_resume(settings: MoonDeckAppRunnerSettings | MoonlightOnlyRunnerSettings):
    suspend_requested = asyncio.Event()
    resume_requested = asyncio.Event()

    loop = asyncio.get_running_loop()
    loop.add_signal_handler(signal.SIGUSR1, suspend_requested.set)
    loop.add_signal_handler(signal.SIGUSR2, resume_requested.set)

    async with SplashScreen() as screen:
        async with MainScreenRunning(screen.canvas):
            while True:
                suspend_requested.clear()
                runner_task = asyncio.create_task(run_runner(settings, screen.canvas))
                suspend_wait_task = asyncio.create_task(suspend_requested.wait())

                try:
                    await asyncio.wait({runner_task, suspend_wait_task}, return_when=asyncio.FIRST_COMPLETED)
                finally:
                    if not suspend_wait_task.done():
                        suspend_wait_task.cancel()
                        with contextlib.suppress(asyncio.CancelledError):
                            await suspend_wait_task

                if runner_task.done():
                    await runner_task
                    return
                
                async with MainScreenSuspended(screen.canvas):
                    logger.info("MoonDeck runner is being suspended!")
                    runner_task.cancel(msg=constants.RUNNER_SUSPEND_CANCEL_MSG)
                    with contextlib.suppress(asyncio.CancelledError):
                        await runner_task
                    change_moondeck_runner_suspended_state(True)

                    resume_requested.clear()
                    await resume_requested.wait()
                    logger.info("MoonDeck runner is being resumed!")
                    change_moondeck_runner_suspended_state(False)


async def main():
    try:
        with acquire_runner_pid_lock():
            logger.info("Resetting runner result and suspended state")
            runnerresult.set_result(runnerresult.Result.ClosedPrematurely, log_result=False)
            change_moondeck_runner_suspended_state(False)

            if not is_moondeck_runner_ready():
                raise runnerresult.RunnerError(runnerresult.Result.RunnerNotReady)

            logger.info("Parsing runner settings")
            settings = await parse_settings()

            if settings["debug_logs"]:
                logger.setLevel(logging.DEBUG)

            await run_with_suspend_resume(settings)
            runnerresult.set_result(None)

    except runnerresult.RunnerError as err:
        runnerresult.set_result(err.result)

    except BuddyException as err:
        logger.exception("Buddy exception")
        runnerresult.set_result(err.result)

    except Exception:
        logger.exception("Unhandled exception")
        runnerresult.set_result(runnerresult.Result.Exception)


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
