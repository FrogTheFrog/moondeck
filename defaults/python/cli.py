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
from argparse import _SubParsersAction, ArgumentParser, ArgumentTypeError, HelpFormatter, SUPPRESS, OPTIONAL, ZERO_OR_MORE
from gettext import gettext
from random import randrange
from typing import Awaitable, Callable, cast

from lib.logger import logger, set_logger_settings
from lib.buddyclient import BuddyException
from lib.cli.settings import CliSettingsManager

from lib.cli.cmd.app.status import execute as cmd_app_status

from lib.cli.cmd.host.scan import execute as cmd_host_scan
from lib.cli.cmd.host.add import execute as cmd_host_add
from lib.cli.cmd.host.remove import execute as cmd_host_remove
from lib.cli.cmd.host.list import execute as cmd_host_list
from lib.cli.cmd.host.pair import execute as cmd_host_pair
from lib.cli.cmd.host.default.set import execute as cmd_host_default_set
from lib.cli.cmd.host.default.clear import execute as cmd_host_default_clear
from lib.cli.cmd.host.wake import execute as cmd_host_wake
from lib.cli.cmd.host.ping import execute as cmd_host_ping
from lib.cli.cmd.host.shutdown import execute as cmd_host_shutdown
from lib.cli.cmd.host.restart import execute as cmd_host_restart
from lib.cli.cmd.host.suspend import execute as cmd_host_suspend

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
DELAY_TYPE = arg_type(int, min_value=1, max_value=30)
PORT_TYPE = arg_type(int, min_value=0, max_value=65535)
PIN_TYPE = arg_type(int, min_value=1000, max_value=9999)


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


def add_cmd_app(subparsers: _SubParsersAction):
    app_parser = subparsers.add_parser(
        "app", help="app related commands")
    app_subparsers = app_parser.add_subparsers(
        dest="cmd2", help="command to execute")
    
    # ---- Setup `status` command
    status_parser = app_subparsers.add_parser(
        "status", help="print the current status of an app monitored by MoonDeck")
    status_parser.add_argument(
        "--host", type=str, help="host id, name or address (default: the \"default\" host)")
    status_parser.add_argument(
        "--json", action="store_true", help="print the output in JSON format")
    status_parser.add_argument(
        "--buddy-timeout", type=TIMEOUT_TYPE, default=1.0, help="time for Buddy to respond to requests (default: %(default)s second(s))")


async def main():
    verbose = False
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
        verbose = parser_args.verbose
        set_logger_settings(parser_args.log_file,
                            print_to_stdout=True,
                            log_preamble=f"Executing: {sys.argv[:]}, CWD: {Path.cwd()}",
                            verbose=verbose)

        # ---- General parser setup [finish]
        parser = ArgumentParserWithRedirect(parents=[parser])
        parser.add_argument("--config-file", type=Path,
                            default=Path("config.json"), help="path to the config file")

        # ---- Setup subparsers
        initial_subparsers = parser.add_subparsers(
            dest="cmd1", help="command to execute")

        add_cmd_app(initial_subparsers)

        # ---- Setup `host` group
        host_parser = initial_subparsers.add_parser(
            "host", help="host related commands")
        host_subparsers = host_parser.add_subparsers(
            dest="cmd2", help="command to execute")

        # -------- Setup `scan` command
        scan_parser = host_subparsers.add_parser(
            "scan", help="scan for available hosts")
        scan_parser.add_argument(
            "--timeout", type=float, default=5.0, help="scan timeout (default: %(default)s second(s))")
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
            "--timeout", type=TIMEOUT_TYPE, default=5.0, help="connection timeout (default: %(default)s second(s))")
        add_parser.add_argument(
            "--dry", action="store_true", help="do not save any changes")
        add_parser.add_argument(
            "--json", action="store_true", help="print the output in JSON format")

        # -------- Setup `remove` command
        remove_parser = host_subparsers.add_parser(
            "remove", help="remove host(s) from config")
        remove_parser.add_argument(
            "host", type=str, help="host id, name or address")
        remove_parser.add_argument(
            "--dry", action="store_true", help="do not save any changes")
        remove_parser.add_argument(
            "--json", action="store_true", help="print the output in JSON format")

        # -------- Setup `list` command
        list_parser = host_subparsers.add_parser(
            "list", help="remove host(s) from config")
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
            "--buddy-timeout", type=TIMEOUT_TYPE, default=5.0, help="time for Buddy to respond to requests (default: %(default)s second(s))")

        # ------------ Setup `default` group
        default_parser = host_subparsers.add_parser(
            "default", help="set or clear the default host (to be used where it can be specified optionally)")
        default_subparsers = default_parser.add_subparsers(
            dest="cmd3", help="command to execute")
        
        # ---------------- Setup `set` command
        set_default_parser = default_subparsers.add_parser(
            "set", help="set the default host")
        set_default_parser.add_argument(
            "host", type=str, help="host id, name or address")
        
        # ---------------- Setup `clear` command
        default_subparsers.add_parser(
            "clear", help="clear the default host")
        
        # -------- Setup `wake` command
        wake_parser = host_subparsers.add_parser(
            "wake", help="send WOL to the host")
        wake_parser.add_argument(
            "--host", type=str, help="host id, name or address (default: the \"default\" host)")
        
        # -------- Setup `ping` command
        ping_parser = host_subparsers.add_parser(
            "ping", help="ping both Buddy and the GameStream server")
        ping_parser.add_argument(
            "--host", type=str, help="host id, name or address (default: the \"default\" host)")
        ping_parser.add_argument(
            "--inverse", action="store_true", help="ping until both Buddy and GameStream server are \"offline\"")
        ping_parser.add_argument(
            "--buddy-timeout", type=TIMEOUT_TYPE, default=1.0, help="time for Buddy to respond to requests (default: %(default)s second(s))")
        ping_parser.add_argument(
            "--server-timeout", type=TIMEOUT_TYPE, default=1.0, help="time for GameStream server to respond to requests (default: %(default)s second(s))")
        ping_parser.add_argument(
            "--timeout", type=TIMEOUT_TYPE, default=60.0, help="how long to continue pinging until both are \"online\" (default: %(default)s second(s))")
        
        # -------- Setup `shutdown` command
        shutdown_parser = host_subparsers.add_parser(
            "shutdown", help="shutdown the paired host")
        shutdown_parser.add_argument(
            "--host", type=str, help="host id, name or address (default: the \"default\" host)")
        shutdown_parser.add_argument(
            "--delay", type=DELAY_TYPE, default=10.0, help="how long Buddy should wait until executing the command (default: %(default)s second(s))")
        shutdown_parser.add_argument(
            "--buddy-timeout", type=TIMEOUT_TYPE, default=1.0, help="time for Buddy to respond to requests (default: %(default)s second(s))")
        
        # -------- Setup `shutdown` command
        restart_parser = host_subparsers.add_parser(
            "restart", help="restart the paired host")
        restart_parser.add_argument(
            "--host", type=str, help="host id, name or address (default: the \"default\" host)")
        restart_parser.add_argument(
            "--delay", type=DELAY_TYPE, default=10.0, help="how long Buddy should wait until executing the command (default: %(default)s second(s))")
        restart_parser.add_argument(
            "--buddy-timeout", type=TIMEOUT_TYPE, default=1.0, help="time for Buddy to respond to requests (default: %(default)s second(s))")
        
        # -------- Setup `suspend` command
        suspend_parser = host_subparsers.add_parser(
            "suspend", help="suspend the paired host")
        suspend_parser.add_argument(
            "--host", type=str, help="host id, name or address (default: the \"default\" host)")
        suspend_parser.add_argument(
            "--delay", type=DELAY_TYPE, default=10.0, help="how long Buddy should wait until executing the command (default: %(default)s second(s))")
        suspend_parser.add_argument(
            "--buddy-timeout", type=TIMEOUT_TYPE, default=1.0, help="time for Buddy to respond to requests (default: %(default)s second(s))")

        # ---- Parse all of the commands
        parser_args, unrecognized_args = parser.parse_known_args()  # Will exit if help is specified
        parser_args = vars(parser_args)

        if unrecognized_args:
            parser.exit(2, gettext(f"{parser.prog}: error: unrecognized arguments {unrecognized_args}"))
            return 2

        # ---- Delegate the commands
        cmds = {
            "app": {
                "launch": None,
                "list": {
                    "non-steam": None
                },
                "status": cmd_app_status
            },
            "host": {
                "scan": cmd_host_scan,
                "add": cmd_host_add,
                "remove": cmd_host_remove,
                "list": cmd_host_list,
                "pair": cmd_host_pair,
                "default": {
                    "set": cmd_host_default_set,
                    "clear": cmd_host_default_clear
                },
                "wake": cmd_host_wake,
                "ping": cmd_host_ping,
                "shutdown": cmd_host_shutdown,
                "restart": cmd_host_restart,
                "suspend": cmd_host_suspend
            },
            "steam": {
                "status": None,
                "launch": None,
                "close": None
            },
            "stream": {
                "status": None,
                "end": None
            }
        }

        cmd_levels = []
        cmd_dict = cmds
        while True:
            next_level = len(cmd_levels) + 1
            level_cmd = parser_args.get(f"cmd{next_level}", None)
            if level_cmd is None:
                parser = ArgumentParserWithRedirect(
                    parents=[parser], add_help=False)
                # Will exit since help is specified (will still return in case it changes in the future)
                parser.parse_known_args(sys.argv[1:] + ["--help"])
                return 2
            
            cmd_levels.append(level_cmd)
            next_dict_value = cmd_dict.get(level_cmd, None)

            if isinstance(next_dict_value, dict):
                cmd_dict = next_dict_value
                continue

            if callable(next_dict_value):
                cmd = cast(Callable[..., Awaitable[int]], next_dict_value)
                sys.exit(await cmd(settings_manager=CliSettingsManager(parser_args["config_file"]), **parser_args))

            # Unhandled cmd
            break

        raise Exception(
            f"Unhandled parser branch: {"->".join(cmd_levels)}")

    except BuddyException as err:
        logger.info(str(err), exc_info=verbose)
        sys.exit(1)

    except asyncio.CancelledError:
        logger.info("Interrupted...")
        sys.exit(1)

    except Exception:
        logger.exception("Unhandled exception")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
