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

from lib.logger import logger, set_logger_settings
from lib.cli.settings import CmdSettingsManager
from lib.cli.cmd.host.scan import execute as cmd_host_scan

import argparse
import sys
import asyncio
# autopep8: on


class ArgumentParserWithRedirect(argparse.ArgumentParser):
    def __init__(self, *args, **kwargs):
        kwargs.setdefault("formatter_class",
                          argparse.ArgumentDefaultsHelpFormatter)
        super().__init__(*args, **kwargs)

    def _print_message(self, message, file=None):
        if message:
            message = message.rstrip('\n')
            if file == sys.stderr:
                logger.error(message)
            else:
                logger.info(message)


async def main():
    try:
        # ---- Setup early logging to at least print something out
        set_logger_settings(None, print_to_stdout=True)

        # ---- General parser setup [start]
        parser = ArgumentParserWithRedirect(
            description="MoonDeck CLI for interaction with MoonDeck Buddy and more.",
            add_help=False)
        parser.add_argument("--verbose", action="store_true",
                            help="enable verbose logging")
        parser.add_argument("--log-file", type=Path,
                            help="path to the optional log file")

        # -------- Setup logging (as early as possible)
        parser_args, _ = parser.parse_known_args()
        set_logger_settings(parser_args.log_file,
                            print_to_stdout=True,
                            log_preamble=f"Executing: {sys.argv[:]}, CWD: {Path.cwd()}",
                            verbose=parser_args.verbose)

        # ---- General parser setup [finish]
        parser = ArgumentParserWithRedirect(parents=[parser])
        parser.add_argument("--config-file", type=Path,
                            default=Path("config.json"), help="path to the config file")

        # ---- Setup subparser groups
        group_subparsers = parser.add_subparsers(
            dest="group", help="group of specialized commands")  # TODO: better wording

        # ---- Setup host group
        host_parser = group_subparsers.add_parser(
            "host", help="host related commands")
        host_subparsers = host_parser.add_subparsers(
            dest="command", help="command to execute")

        # -------- Setup scan command
        scan_parser = host_subparsers.add_parser(
            "scan", help="scan for available hosts")
        scan_parser.add_argument(
            "--timeout", type=float, default=5.0, help="Scan timeout in seconds")
        scan_parser.add_argument(
            "--dry", action="store_true", help="Do not save any changes")
        scan_parser.add_argument("--overwrite", action="store_true",
                                 help="Remove any hosts from the config that were not found during scan")

        # ---- Parse all of the commands
        parser_args, _ = parser.parse_known_args()  # Will exit if help is specified
        parser_args = vars(parser_args)

        # ---- Delegate the commands
        if parser_args["group"] is None or parser_args.get("command", None) is None:
            parser = ArgumentParserWithRedirect(
                parents=[parser], add_help=False)
            # Will exit since help is specified
            parser.parse_known_args(sys.argv[1:] + ["--help"])

        cmds = {
            "host": {
                "scan": cmd_host_scan
            }
        }

        cmd = cmds.get(parser_args["group"], {}).get(
            parser_args["command"], None)
        if cmd is not None:
            sys.exit(await cmd(settings=CmdSettingsManager(parser_args["config_file"]), **parser_args))

        raise Exception(
            f"Unhandled parser branch {parser_args["group"]}->{parser_args["command"]}")

    except Exception:
        logger.exception("Unhandled exception")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
