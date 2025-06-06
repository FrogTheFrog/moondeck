# autopep8: off
def get_plugin_dir():
    from pathlib import Path
    return Path(__file__).parent.resolve()

def add_plugin_to_path():
    import sys

    plugin_dir = get_plugin_dir()
    directories = [["./"], ["lib"], ["externals"]]
    for dir in directories:
        sys.path.insert(0, str(plugin_dir.joinpath(*dir)))

add_plugin_to_path()

from pathlib import Path
from argparse import ArgumentParser, ArgumentTypeError, HelpFormatter, SUPPRESS, OPTIONAL, ZERO_OR_MORE
from gettext import gettext
from random import randrange

from lib.logger import logger, set_logger_settings
from lib.cli.settings import CliSettingsManager

from lib.cli.cmd.host.scan import execute as cmd_host_scan
from lib.cli.cmd.host.add import execute as cmd_host_add
from lib.cli.cmd.host.remove import execute as cmd_host_remove
from lib.cli.cmd.host.list import execute as cmd_host_list
from lib.cli.cmd.host.pair import execute as cmd_host_pair
from lib.cli.cmd.host.set_default import execute as cmd_host_set_default
from lib.cli.cmd.host.reset_default import execute as cmd_host_reset_default

import sys
import asyncio
# autopep8: on


def arg_type(value_type, min_value=None, max_value=None):
    def checker(arg: str):
        try:
            f = value_type(arg)
        except ValueError:
            raise ArgumentTypeError(f"must be a valid {value_type}")
        if (min_value is not None and f < min_value) or (max_value is not None and f > max_value):
            raise ArgumentTypeError(
                f"must be within [{min_value}, {max_value}]")
        return f

    return checker


TIMEOUT_TYPE = arg_type(float, min_value=1)
PORT_TYPE = arg_type(int, min_value=0, max_value=65535)
PIN_TYPE = arg_type(int, min_value=1000, max_value=9999)

DEFAULT_TIMEOUT = 5.0


class CustomArgumentDefaultsHelpFormatter(HelpFormatter):
    def _get_help_string(self, action):
        help = action.help
        if help is None:
            help = ""

        if "default:" not in help:
            if action.default is not SUPPRESS:
                defaulting_nargs = [OPTIONAL, ZERO_OR_MORE]
                if action.option_strings or action.nargs in defaulting_nargs:
                    help += gettext(" (default: %(default)s)")
        return help


class ArgumentParserWithRedirect(ArgumentParser):
    def __init__(self, *args, **kwargs):
        kwargs.setdefault("formatter_class",
                          CustomArgumentDefaultsHelpFormatter)
        super().__init__(*args, **kwargs)

    def _print_message(self, message, file=None):
        if message:
            message = message.rstrip("\n")
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

        # -------- Setup `scan` command
        scan_parser = host_subparsers.add_parser(
            "scan", help="scan for available hosts")
        scan_parser.add_argument(
            "--timeout", type=float, default=5.0, help="scan timeout in seconds")
        scan_parser.add_argument(
            "--dry", action="store_true", help="do not save any changes")
        scan_parser.add_argument(
            "--json", action="store_true", help="print the output in JSON format")
        scan_parser.add_argument(
            "--prune", action="store_true",
            help="remove any previously scanned hosts from the config that were not found during scan")

        # -------- Setup `add` command
        add_parser = host_subparsers.add_parser(
            "add", help="manually add reachable GameStream host (will replace scanned one)")
        add_parser.add_argument(
            "address", type=str, help="IP address or valid domain")
        add_parser.add_argument(
            "port", type=PORT_TYPE, help="the HTTP port of the server")
        add_parser.add_argument(
            "--timeout", type=TIMEOUT_TYPE, default=5.0, help="connection timeout in seconds")
        add_parser.add_argument(
            "--dry", action="store_true", help="do not save any changes")
        add_parser.add_argument(
            "--json", action="store_true", help="print the output in JSON format")

        # -------- Setup `remove` command
        remove_parser = host_subparsers.add_parser(
            "remove", help="remove host(-s) from config")
        remove_parser.add_argument(
            "host", type=str, help="host id, name or address")
        remove_parser.add_argument(
            "--dry", action="store_true", help="do not save any changes")
        remove_parser.add_argument(
            "--json", action="store_true", help="print the output in JSON format")

        # -------- Setup `list` command
        list_parser = host_subparsers.add_parser(
            "list", help="remove host(-s) from config")
        list_parser.add_argument(
            "--json", action="store_true", help="print the output in JSON format")

        # -------- Setup `pair` command
        pair_parser = host_subparsers.add_parser(
            "pair", help="pair MoonDeck CLI with Buddy")
        pair_parser.add_argument(
            "host", type=str, help="host id, name or address")
        pair_parser.add_argument(
            "--pin", type=PIN_TYPE, default=randrange(1000, 9999), help="4-digit pin to use for pairing (default: random 4-digit pin)")
        pair_parser.add_argument(
            "--buddy-port", type=PORT_TYPE, default=59999, help="port to be used for Buddy")
        pair_parser.add_argument(
            "--buddy-timeout", type=TIMEOUT_TYPE, default=DEFAULT_TIMEOUT, help="time for Buddy to respond to requests")

        # -------- Setup `set-default` command
        set_default_parser = host_subparsers.add_parser(
            "set-default", help="set the default host to be used where it can be specified optionally")
        set_default_parser.add_argument(
            "host", type=str, help="host id, name or address")
        
        # -------- Setup `reset-default` command
        host_subparsers.add_parser(
            "reset-default", help="reset the default host to None")

        # ---- Parse all of the commands
        parser_args, unrecognized_args = parser.parse_known_args()  # Will exit if help is specified
        parser_args = vars(parser_args)

        if unrecognized_args:
            parser.error(f"unrecognized arguments {unrecognized_args}")
            return 1

        # ---- Delegate the commands
        if parser_args["group"] is None or parser_args.get("command", None) is None:
            parser = ArgumentParserWithRedirect(
                parents=[parser], add_help=False)
            # Will exit since help is specified
            parser.parse_known_args(sys.argv[1:] + ["--help"])

        cmds = {
            "host": {
                "scan": cmd_host_scan,
                "add": cmd_host_add,
                "remove": cmd_host_remove,
                "list": cmd_host_list,
                "pair": cmd_host_pair,
                "set-default": cmd_host_set_default,
                "reset-default": cmd_host_reset_default
            }
        }

        cmd = cmds.get(parser_args["group"], {}).get(
            parser_args["command"], None)
        if cmd is not None:
            sys.exit(await cmd(settings_manager=CliSettingsManager(parser_args["config_file"]), **parser_args))

        raise Exception(
            f"Unhandled parser branch {parser_args["group"]}->{parser_args["command"]}")

    except asyncio.CancelledError:
        logger.info("Interrupted...")
        sys.exit(1)

    except Exception:
        logger.exception("Unhandled exception")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
