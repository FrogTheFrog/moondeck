from __future__ import annotations

# autopep8: off
def add_plugin_to_path():
    import sys
    from pathlib import Path

    sys_path_backup = list(sys.path)
    script_dir = Path(__file__).parent.resolve()
    directories = [["lib"], ["externals"]]
    for dir in directories:
        sys.path.append(str(script_dir.joinpath(*dir)))

    def restore_path():
        sys.path = sys_path_backup

    return restore_path

# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
restore_sys_path = add_plugin_to_path()  


import sys
import asyncio

from pathlib import Path
from argparse import _SubParsersAction, ArgumentParser, ArgumentTypeError, HelpFormatter, SUPPRESS, OPTIONAL, ZERO_OR_MORE
from gettext import gettext
from random import randrange
from typing import Awaitable, Callable, cast

from lib.logger import logger, set_logger_settings
from lib.buddyclient import BuddyException
from lib.cli.settings import CliSettingsManager

from lib.cli.cmd.app.clear import execute as cmd_app_clear
from lib.cli.cmd.app.launch import execute as cmd_app_launch
from lib.cli.cmd.app.list.game_stream import execute as cmd_app_list_game_stream
from lib.cli.cmd.app.list.non_steam import execute as cmd_app_list_non_steam
from lib.cli.cmd.app.status import execute as cmd_app_status

from lib.cli.cmd.host.add import execute as cmd_host_add
from lib.cli.cmd.host.default.clear import execute as cmd_host_default_clear
from lib.cli.cmd.host.default.set import execute as cmd_host_default_set
from lib.cli.cmd.host.list import execute as cmd_host_list
from lib.cli.cmd.host.pair import execute as cmd_host_pair
from lib.cli.cmd.host.ping import execute as cmd_host_ping
from lib.cli.cmd.host.remove import execute as cmd_host_remove
from lib.cli.cmd.host.restart import execute as cmd_host_restart
from lib.cli.cmd.host.scan import execute as cmd_host_scan
from lib.cli.cmd.host.shutdown import execute as cmd_host_shutdown
from lib.cli.cmd.host.suspend import execute as cmd_host_suspend
from lib.cli.cmd.host.wake import execute as cmd_host_wake

from lib.cli.cmd.steam.close import execute as cmd_steam_close
from lib.cli.cmd.steam.launch import execute as cmd_steam_launch
from lib.cli.cmd.steam.status import execute as cmd_steam_status

from lib.cli.cmd.stream.end import execute as cmd_stream_end
from lib.cli.cmd.stream.status import execute as cmd_stream_status


restore_sys_path()
# <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
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


# Custom types
TYPE_TIMEOUT = arg_type(float, min_value=1)
TYPE_RETRY = arg_type(int, min_value=1)
TYPE_PORT = arg_type(int, min_value=0, max_value=65535)
TYPE_PIN = arg_type(int, min_value=1000, max_value=9999)
TYPE_DELAY = arg_type(int, min_value=1, max_value=30)

# Common descriptions
DESC_HOST = "host id, name or address (default: the \"default\" host)"
DESC_HOST_NON_OPT = "host id, name or address"
DESC_BUDDY_TIMEOUT = "time for Buddy to respond to requests (default: %(default)s second(s))"
DESC_SERVER_TIMEOUT = "time for GameStream server to respond to requests (default: %(default)s second(s))"
DESC_PING_TIMEOUT = "how long to continue pinging until Buddy and GameStream server are both \"online\" (default: %(default)s second(s))"
DESC_JSON = "print the output in JSON format"
DESC_DRY = "do not save any changes"
DESC_DELAY = "how long Buddy should wait until executing the command (default: %(default)s second(s))"

# Common defaults
DEF_TIMEOUT = 5.0
DEF_DELAY = 10.0


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


def add_cmd_app(main_subparsers: _SubParsersAction[ArgumentParserWithRedirect]):
    # ---- Setup `app` group
    app_parser = main_subparsers.add_parser(
        "app", help="app related commands")
    app_subparsers = app_parser.add_subparsers(
        dest="cmd2", help="command to execute")
    
    # -------- Setup `clear` command
    clear_parser = app_subparsers.add_parser(
        "clear", help="clear the monitored app on Buddy")
    clear_parser.add_argument(
        "--host", type=str, help=DESC_HOST)
    clear_parser.add_argument(
        "--buddy-timeout", type=TYPE_TIMEOUT, default=DEF_TIMEOUT, help=DESC_BUDDY_TIMEOUT)
    
    # -------- Setup `list` group
    list_parser = app_subparsers.add_parser(
        "list", help="get app lists from Buddy")
    list_subparsers = list_parser.add_subparsers(
        dest="cmd3", help="command to execute")
    
    # -------- Setup `game-stream` command
    game_stream_parser = list_subparsers.add_parser(
        "game-stream", help="print the list of GameStream apps on the host")
    game_stream_parser.add_argument(
        "--host", type=str, help=DESC_HOST)
    game_stream_parser.add_argument(
        "--json", action="store_true", help=DESC_JSON)
    game_stream_parser.add_argument(
        "--buddy-timeout", type=TYPE_TIMEOUT, default=DEF_TIMEOUT, help=DESC_BUDDY_TIMEOUT)

    # -------- Setup `non-steam` command
    non_steam_parser = list_subparsers.add_parser(
        "non-steam", help="print the list of non-Steam apps on the host")
    non_steam_parser.add_argument(
        "user-id", type=str, help="the Steam user id in SteamID64 format to get apps for")
    non_steam_parser.add_argument(
        "--host", type=str, help=DESC_HOST)
    non_steam_parser.add_argument(
        "--json", action="store_true", help=DESC_JSON)
    non_steam_parser.add_argument(
        "--buddy-timeout", type=TYPE_TIMEOUT, default=DEF_TIMEOUT, help=DESC_BUDDY_TIMEOUT)
    
    # -------- Setup `launch` command
    launch_parser = app_subparsers.add_parser(
        "launch", help="launch the app on host")
    launch_parser.add_argument(
        "app-id", type=str, help="the app id to launch")
    launch_parser.add_argument(
        "--host", type=str, help=DESC_HOST)
    launch_parser.add_argument(
        "--buddy-timeout", type=TYPE_TIMEOUT, default=DEF_TIMEOUT, help=DESC_BUDDY_TIMEOUT)
    launch_parser.add_argument(
        "--simple", action="store_true", help="simply execute launch command directly without following the recommended workflow - this will make all of the optional args below here obsolete")
    launch_parser.add_argument(
        "--server-timeout", type=TYPE_TIMEOUT, default=DEF_TIMEOUT, help=DESC_SERVER_TIMEOUT)
    launch_parser.add_argument(
        "--ping-timeout", type=TYPE_TIMEOUT, default=60.0, help=DESC_PING_TIMEOUT)
    launch_parser.add_argument(
        "--precheck-retries", type=TYPE_RETRY, default=30, help="how long to keep checking until initial launch conditions are met (default: %(default)s time(s))")
    launch_parser.add_argument(
        "--bpm", action="store_true", help="ensure that Steam is running in the Big Picture Mode")
    launch_parser.add_argument(
        "--no-stream", action="store_true", help="do not manage the lifetime of MoonDeckStream - will also make related args obsolete")
    launch_parser.add_argument(
        "--no-cleanup", action="store_true", help="do not end MoonDeckStream or clear monitored app data if launch fails")
    launch_parser.add_argument(
        "--close-steam", action="store_true", help="close Steam once the launched app has been ended at the end of successful session")
    launch_parser.add_argument(
        "--stream-rdy-retries", type=TYPE_RETRY, default=30, help="how long to keep checking until MoonDeckStream is running (default: %(default)s time(s))")
    launch_parser.add_argument(
        "--steam-rdy-retries", type=TYPE_RETRY, default=60, help="how long to keep checking until Steam is running and is also in BPM if requested (default: %(default)s time(s))")
    launch_parser.add_argument(
        "--stability-retries", type=TYPE_RETRY, default=15, help="how long to wait until app is considered as stable - to circumvent launchers (like EA) that make the app switch between \"Stopped\" and \"Running\" states (default: %(default)s time(s))")
    launch_parser.add_argument(
        "--launch-retries", type=TYPE_RETRY, default=30, help="how long to wait until app's state changes from \"Stopped\" (default: %(default)s time(s))")
    launch_parser.add_argument(
        "--stream-end-retries", type=TYPE_RETRY, default=15, help="how long to until the MoonDeckStream is ended at the end of successful session (default: %(default)s time(s))")

    # -------- Setup `status` command
    status_parser = app_subparsers.add_parser(
        "status", help="print the current status of an app known to MoonDeck")
    status_parser.add_argument(
        "--app-id", type=str, help="the app id to get status for, if not specified, the monitored app will be queried")
    status_parser.add_argument(
        "--host", type=str, help=DESC_HOST)
    status_parser.add_argument(
        "--json", action="store_true", help=DESC_JSON)
    status_parser.add_argument(
        "--buddy-timeout", type=TYPE_TIMEOUT, default=DEF_TIMEOUT, help=DESC_BUDDY_TIMEOUT)


def add_cmd_host(main_subparsers: _SubParsersAction[ArgumentParserWithRedirect]):
    # ---- Setup `host` group
    host_parser = main_subparsers.add_parser(
        "host", help="host related commands")
    host_subparsers = host_parser.add_subparsers(
        dest="cmd2", help="command to execute")
    
    # -------- Setup `add` command
    add_parser = host_subparsers.add_parser(
        "add", help="manually add reachable GameStream host (will replace scanned one)")
    add_parser.add_argument(
        "address", type=str, help="IP address or valid domain")
    add_parser.add_argument(
        "port", type=TYPE_PORT, help="the HTTP port of the server")
    add_parser.add_argument(
        "--timeout", type=TYPE_TIMEOUT, default=DEF_TIMEOUT, help="connection timeout (default: %(default)s second(s))")
    add_parser.add_argument(
        "--dry", action="store_true", help=DESC_DRY)
    add_parser.add_argument(
        "--json", action="store_true", help=DESC_JSON)
    
    # ------------ Setup `default` group
    default_parser = host_subparsers.add_parser(
        "default", help="set or clear the default host (to be used where it can be specified optionally)")
    default_subparsers = default_parser.add_subparsers(
        dest="cmd3", help="command to execute")
    
    # ---------------- Setup `clear` command
    default_subparsers.add_parser(
        "clear", help="clear the default host")
    
    # ---------------- Setup `set` command
    set_default_parser = default_subparsers.add_parser(
        "set", help="set the default host")
    set_default_parser.add_argument(
        "host", type=str, help=DESC_HOST_NON_OPT)
    
    # -------- Setup `list` command
    list_parser = host_subparsers.add_parser(
        "list", help="remove host(s) from config")
    list_parser.add_argument(
        "--json", action="store_true", help=DESC_JSON)
    
    # -------- Setup `pair` command
    pair_parser = host_subparsers.add_parser(
        "pair", help="pair MoonDeck CLI with Buddy")
    pair_parser.add_argument(
        "host", type=str, help=DESC_HOST_NON_OPT)
    pair_parser.add_argument(
        "--pin", type=TYPE_PIN, default=randrange(1000, 9999), help="4-digit pin to use for pairing (default: random 4-digit pin)")
    pair_parser.add_argument(
        "--buddy-port", type=TYPE_PORT, default=59999, help="port to be used for Buddy")
    pair_parser.add_argument(
        "--buddy-timeout", type=TYPE_TIMEOUT, default=DEF_TIMEOUT, help=DESC_BUDDY_TIMEOUT)
    
    # -------- Setup `ping` command
    ping_parser = host_subparsers.add_parser(
        "ping", help="ping both Buddy and the GameStream server")
    ping_parser.add_argument(
        "--host", type=str, help=DESC_HOST)
    ping_parser.add_argument(
        "--inverse", action="store_true", help="ping until both Buddy and GameStream server are \"offline\"")
    ping_parser.add_argument(
        "--buddy-timeout", type=TYPE_TIMEOUT, default=1.0, help=DESC_BUDDY_TIMEOUT)
    ping_parser.add_argument(
        "--server-timeout", type=TYPE_TIMEOUT, default=1.0, help=DESC_SERVER_TIMEOUT)
    ping_parser.add_argument(
        "--timeout", type=TYPE_TIMEOUT, default=60.0, help="how long to continue pinging until both are \"online\" (default: %(default)s second(s))")

    # -------- Setup `remove` command
    remove_parser = host_subparsers.add_parser(
        "remove", help="remove host(s) from config")
    remove_parser.add_argument(
        "host", type=str, help=DESC_HOST_NON_OPT)
    remove_parser.add_argument(
        "--dry", action="store_true", help=DESC_DRY)
    remove_parser.add_argument(
        "--json", action="store_true", help=DESC_JSON)
    
    # -------- Setup `restart` command
    restart_parser = host_subparsers.add_parser(
        "restart", help="restart the paired host")
    restart_parser.add_argument(
        "--host", type=str, help=DESC_HOST)
    restart_parser.add_argument(
        "--delay", type=TYPE_DELAY, default=DEF_DELAY, help=DESC_DELAY)
    restart_parser.add_argument(
        "--buddy-timeout", type=TYPE_TIMEOUT, default=DEF_TIMEOUT, help=DESC_BUDDY_TIMEOUT)
    
    # -------- Setup `scan` command
    scan_parser = host_subparsers.add_parser(
        "scan", help="scan for available hosts")
    scan_parser.add_argument(
        "--timeout", type=float, default=DEF_TIMEOUT, help="scan timeout (default: %(default)s second(s))")
    scan_parser.add_argument(
        "--dry", action="store_true", help=DESC_DRY)
    scan_parser.add_argument(
        "--json", action="store_true", help=DESC_JSON)
    scan_parser.add_argument(
        "--prune", action="store_true", help="remove any previously scanned hosts from the config that were not found during scan")

    # -------- Setup `shutdown` command
    shutdown_parser = host_subparsers.add_parser(
        "shutdown", help="shutdown the paired host")
    shutdown_parser.add_argument(
        "--host", type=str, help=DESC_HOST)
    shutdown_parser.add_argument(
        "--delay", type=TYPE_DELAY, default=DEF_DELAY, help=DESC_DELAY)
    shutdown_parser.add_argument(
        "--buddy-timeout", type=TYPE_TIMEOUT, default=DEF_TIMEOUT, help=DESC_BUDDY_TIMEOUT)
    
    # -------- Setup `suspend` command
    suspend_parser = host_subparsers.add_parser(
        "suspend", help="suspend the paired host")
    suspend_parser.add_argument(
        "--host", type=str, help=DESC_HOST)
    suspend_parser.add_argument(
        "--delay", type=TYPE_DELAY, default=DEF_DELAY, help=DESC_DELAY)
    suspend_parser.add_argument(
        "--buddy-timeout", type=TYPE_TIMEOUT, default=DEF_TIMEOUT, help=DESC_BUDDY_TIMEOUT)
    
    # -------- Setup `wake` command
    wake_parser = host_subparsers.add_parser(
        "wake", help="send WOL to the host")
    wake_parser.add_argument(
        "--host", type=str, help=DESC_HOST)


def add_cmd_steam(main_subparsers: _SubParsersAction[ArgumentParserWithRedirect]):
    # ---- Setup `steam` group
    steam_parser = main_subparsers.add_parser(
        "steam", help="Steam related commands")
    steam_subparsers = steam_parser.add_subparsers(
        dest="cmd2", help="command to execute")
    
    # -------- Setup `close` command
    close_parser = steam_subparsers.add_parser(
        "close", help="close Steam on host")
    close_parser.add_argument(
        "--host", type=str, help=DESC_HOST)
    close_parser.add_argument(
        "--buddy-timeout", type=TYPE_TIMEOUT, default=DEF_TIMEOUT, help=DESC_BUDDY_TIMEOUT)
    
    # -------- Setup `launch` command
    launch_parser = steam_subparsers.add_parser(
        "launch", help="launch Steam on host")
    launch_parser.add_argument(
        "--host", type=str, help=DESC_HOST)
    launch_parser.add_argument(
        "--buddy-timeout", type=TYPE_TIMEOUT, default=DEF_TIMEOUT, help=DESC_BUDDY_TIMEOUT)
    launch_parser.add_argument(
        "--bpm", action="store_true", help="launch Steam in Big Picture Mode")
    
    # -------- Setup `status` command
    status_parser = steam_subparsers.add_parser(
        "status", help="print the current Steam status")
    status_parser.add_argument(
        "--host", type=str, help=DESC_HOST)
    status_parser.add_argument(
        "--json", action="store_true", help=DESC_JSON)
    status_parser.add_argument(
        "--buddy-timeout", type=TYPE_TIMEOUT, default=DEF_TIMEOUT, help=DESC_BUDDY_TIMEOUT)


def add_cmd_stream(main_subparsers: _SubParsersAction[ArgumentParserWithRedirect]):
    # ---- Setup `stream` group
    stream_parser = main_subparsers.add_parser(
        "stream", help="stream related commands")
    stream_subparsers = stream_parser.add_subparsers(
        dest="cmd2", help="command to execute")
    
    # -------- Setup `end` command
    end_parser = stream_subparsers.add_parser(
        "end", help="end the MoonDeckStream process on host (doing this also clears the monitored app on Buddy)")
    end_parser.add_argument(
        "--host", type=str, help=DESC_HOST)
    end_parser.add_argument(
        "--buddy-timeout", type=TYPE_TIMEOUT, default=DEF_TIMEOUT, help=DESC_BUDDY_TIMEOUT)

    # -------- Setup `status` command
    status_parser = stream_subparsers.add_parser(
        "status", help="print the current MoonDeckStream status")
    status_parser.add_argument(
        "--host", type=str, help=DESC_HOST)
    status_parser.add_argument(
        "--json", action="store_true", help=DESC_JSON)
    status_parser.add_argument(
        "--buddy-timeout", type=TYPE_TIMEOUT, default=DEF_TIMEOUT, help=DESC_BUDDY_TIMEOUT)


async def main():
    verbose = False
    try:
        # ---- Setup early logging to at least print something out
        set_logger_settings(None, print_to_std=True)

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
                            print_to_std=True,
                            log_preamble=f"Executing: {sys.argv[:]}, CWD: {Path.cwd()}",
                            verbose=verbose)

        # ---- General parser setup [finish]
        parser = ArgumentParserWithRedirect(parents=[parser])
        parser.add_argument("--config-file", type=Path,
                            default=Path("config.json"), help="path to the config file")

        # ---- Setup subparsers
        main_subparsers = parser.add_subparsers(
            dest="cmd1", help="command to execute")

        add_cmd_app(main_subparsers)
        add_cmd_host(main_subparsers)
        add_cmd_steam(main_subparsers)
        add_cmd_stream(main_subparsers)

        # ---- Parse all of the commands
        parser_args, unrecognized_args = parser.parse_known_args()  # Will exit if help is specified
        parser_args = { k.replace("-", "_"):v for k, v in vars(parser_args).items() }

        if unrecognized_args:
            parser.exit(2, gettext(f"{parser.prog}: error: unrecognized arguments {unrecognized_args}"))
            return 2

        # ---- Delegate the commands
        cmds = {
            "app": {
                "clear": cmd_app_clear,
                "launch": cmd_app_launch,
                "list": {
                    "game-stream": cmd_app_list_game_stream,
                    "non-steam": cmd_app_list_non_steam
                },
                "status": cmd_app_status
            },
            "host": {
                "add": cmd_host_add,
                "default": {
                    "clear": cmd_host_default_clear,
                    "set": cmd_host_default_set
                },
                "list": cmd_host_list,
                "pair": cmd_host_pair,
                "ping": cmd_host_ping,
                "remove": cmd_host_remove,
                "restart": cmd_host_restart,
                "scan": cmd_host_scan,
                "shutdown": cmd_host_shutdown,
                "suspend": cmd_host_suspend,
                "wake": cmd_host_wake
            },
            "steam": {
                "close": cmd_steam_close,
                "launch": cmd_steam_launch,
                "status": cmd_steam_status
            },
            "stream": {
                "end": cmd_stream_end,
                "status": cmd_stream_status
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

        raise Exception(f"Unhandled parser branch: {"->".join(cmd_levels)}")

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
