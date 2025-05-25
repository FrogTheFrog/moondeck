# autopep8: off
def get_plugin_dir():
    from pathlib import Path
    return Path(__file__).parent.resolve()

def add_plugin_to_path():
    import sys

    plugin_dir = get_plugin_dir()
    directories = [["./"], ["lib"], ["externals"]]
    for dir in directories:
        sys.path.append(str(plugin_dir.joinpath(*dir)))

add_plugin_to_path()

from pathlib import Path
from lib.runner.moondeckapprunner import MoonDeckAppRunner
from lib.runner.moonlightonlyrunner import MoonlightOnlyRunner
from lib.logger import logger, set_logger_settings, enable_debug_level
from lib.utils import is_moondeck_runner_ready
from lib.runner.settingsparser import parse_settings, RunnerType

import argparse

import sys
import asyncio
import lib.constants as constants
import lib.runnerresult as runnerresult
# autopep8: on


async def main():
    try:
        # General arguments
        parser = argparse.ArgumentParser(
            description="MoonDeck CLI for interaction with MoonDeck Buddy and more.",
            formatter_class=argparse.ArgumentDefaultsHelpFormatter)
        parser.add_argument("--verbose", action='store_true',
                            help="enable verbose logging")
        parser.add_argument("--log-file", type=Path,
                            help="path to the optional log file")
        # parser.add_argument("--config-file", type=Path,
        #                     default=Path("config.json"), help="path to the config file")
        parser_args, _ = parser.parse_known_args()

        # Setup logging
        set_logger_settings(parser_args.log_file,
                            print_to_stdout=True,
                            log_preamble=f"Executing: {sys.argv[:]}, CWD: {Path.cwd()}",
                            verbose=parser_args.verbose)

        logger.debug("LOL")
        logger.info("LOL")
        logger.warning("LOL")
        logger.error("LOL")
        logger.critical("LOL")
        sys.exit(1)

        # subparsers = parser.add_subparsers(dest="command", help="command to execute")

        # # Scan command
        # scan_parser = subparsers.add_parser("scan", help="scan for available hosts")
        # scan_parser.add_argument("--timeout", type=float, default=5.0, help="Scan timeout in seconds")

        # parser.print_help()

    except Exception:
        logger.exception("Unhandled exception")


if __name__ == "__main__":
    asyncio.run(main())
