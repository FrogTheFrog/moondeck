# autopep8: off
def add_plugin_to_path():
    import sys
    from pathlib import Path

    sys_path_backup = list(sys.path)
    script_dir = Path(__file__).parent.resolve()
    directories = [["lib"], ["externals"]]
    for dir in directories:
        sys.path.insert(0, str(script_dir.joinpath(*dir)))

    def restore_path():
        sys.path = sys_path_backup

    return restore_path

# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
restore_sys_path = add_plugin_to_path()  


from lib.buddyclient import BuddyException
from lib.runner.moondeckapprunner import MoonDeckAppRunner
from lib.runner.moonlightonlyrunner import MoonlightOnlyRunner
from lib.logger import logger, set_logger_settings, enable_debug_level
from lib.utils import is_moondeck_runner_ready
from lib.runner.settingsparser import parse_settings, RunnerType

import asyncio
import lib.constants as constants
import lib.runnerresult as runnerresult


restore_sys_path()
# <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
# autopep8: on

set_logger_settings(constants.RUNNER_LOG_FILE, rotate=False)

async def main():
    try:
        logger.info("Resetting runner result")
        runnerresult.set_result(runnerresult.Result.ClosedPrematurely, log_result=False)

        if not is_moondeck_runner_ready():
            raise runnerresult.RunnerError(runnerresult.Result.RunnerNotReady)

        logger.info("Parsing runner settings")
        settings = await parse_settings()

        if settings["debug_logs"]:
            enable_debug_level()
        
        if settings["runner_type"] == RunnerType.MoonDeck:
            await MoonDeckAppRunner.run(settings)
        else:
            await MoonlightOnlyRunner.run(settings)

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
    asyncio.run(main())
