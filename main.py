# autopep8: off
# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
def add_plugin_to_path():
    import sys
    from pathlib import Path

    script_dir = Path(__file__).parent.resolve()
    directories = [["python"], ["python", "lib"], ["python", "externals"]]
    for dir in directories:
        sys.path.append(str(script_dir.joinpath(*dir)))

add_plugin_to_path()  
# <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
# autopep8: on


import asyncio
import logging
import pathlib
import lib.gamestreaminfo as gamestreaminfo
import lib.constants as constants
import lib.utils as utils

from typing import Optional
from lib.plugin.settings import UserSettings, UserSettingsManager
from lib.logger import logger, set_logger_settings, get_logger
from lib.buddyrequests import SteamUiMode, SteamUiModeResponse, CurrentUserResponse, BuddyException
from lib.buddyclient import BuddyClient, AbortHostStateChangeResult
from lib.utils import wake_on_lan, change_moondeck_runner_ready_state, TimedPooler
from lib.runnerresult import Result, set_result, get_result
from lib.moonlightproxy import MoonlightProxy

set_logger_settings(logger, constants.LOG_FILE, rotate=True)

frontend_logger = get_logger("frontend")
set_logger_settings(frontend_logger, constants.FRONTEND_LOG_FILE, rotate=True)

settings_manager = UserSettingsManager(constants.get_config_file_path())


class Plugin:
    def __cleanup_states(self):
        set_result(None)
        change_moondeck_runner_ready_state(False)

    @utils.async_scope_log(logger.info)
    async def _main(self):
        self.__cleanup_states()

    @utils.async_scope_log(logger.info)
    async def _unload(self):
        self.__cleanup_states()

    async def frontend_log_entry(self, level: str, message: str):
        try:
            frontend_logger.log(logging._checkLevel(level), message)
        except Exception:
            logger.exception("Failed to save frontend log")

    @utils.async_scope_log(logger.info)
    async def set_runner_ready(self):
        change_moondeck_runner_ready_state(True)

    @utils.async_scope_log(logger.info)
    async def get_runner_result(self):
        result = get_result()
        # Cleanup is needed to differentiate between moondeck launches
        set_result(None)
        return result
    
    def set_log_levels(self, data: UserSettings):
        level = logging.DEBUG if data["runnerDebugLogs"] else logging.INFO
        logger.setLevel(level)
        frontend_logger.setLevel(level)

    @utils.async_scope_log(logger.info)
    async def get_user_settings(self):
        try:
            data = await settings_manager.read_or_update()
            self.set_log_levels(data)
            return data
        except Exception:
            logger.exception("Failed to get user settings")
            return None

    @utils.async_scope_log(logger.info)
    async def set_user_settings(self, data: UserSettings):
        try:
            await settings_manager.write(data)
            self.set_log_levels(data)
        except Exception:
            logger.exception("Failed to set user settings")

    @utils.async_scope_log(logger.info)
    async def scan_for_hosts(self, timeout: float):
        try:
            return await gamestreaminfo.scan_for_hosts(timeout=timeout)
        except Exception:
            logger.exception("Unhandled exception")
            return []

    @utils.async_scope_log(logger.info)
    async def find_host(self, host_id: str, timeout: float):
        try:
            return await gamestreaminfo.find_host(host_id, timeout=timeout)
        except Exception:
            logger.exception("Unhandled exception")
            return None

    @utils.async_scope_log(logger.info)
    async def get_server_info(self, address: str, port: int, timeout: float):
        try:
            return await gamestreaminfo.get_server_info(address, port, timeout=timeout)
        except Exception:
            logger.exception("Unhandled exception")
            return None

    @utils.async_scope_log(logger.info)
    async def get_buddy_info(self, address: str, buddy_port: int, client_id: str, timeout: float):
        try:
            async with BuddyClient(address, buddy_port, client_id, timeout) as client:
                info = await client.get_host_info()
                return {"status": "Online", "info": info}

        except BuddyException as err:
            return {"status": err.result.name, "info": None}

        except Exception:
            logger.exception("Unhandled exception")
            return {"status": "Exception", "info": None}

    @utils.async_scope_log(logger.info)
    async def start_pairing(self, address: str, buddy_port: int, client_id: str, pin: int, timeout: float):
        try:
            async with BuddyClient(address, buddy_port, client_id, timeout) as client:
                await client.start_pairing(pin)
                return "PairingStarted"

        except BuddyException as err:
            logger.exception("Buddy exception while pairing")
            return err.result.name

        except Exception:
            logger.exception("Unhandled exception")
            return "Exception"

    @utils.async_scope_log(logger.info)
    async def abort_pairing(self, address: str, buddy_port: int, client_id: str, timeout: float):
        try:
            async with BuddyClient(address, buddy_port, client_id, timeout) as client:
                await client.abort_pairing()

        except BuddyException:
            logger.exception("Buddy exception while aborting pairing")

        except Exception:
            logger.exception("Unhandled exception")

    @utils.async_scope_log(logger.info)
    async def wake_on_lan(self, hostname: str, address: str, mac: str, port: int, custom_exec: Optional[str]):
        try:
            await wake_on_lan(hostname, address, mac, port, custom_exec)
        except Exception:
            logger.exception("Unhandled exception")

    @utils.async_scope_log(logger.info)
    async def restart_host(self, address: str, buddy_port: int, client_id: str, delay_s: int, timeout: float):
        try:
            async with BuddyClient(address, buddy_port, client_id, timeout) as client:
                await client.restart_host(delay_s)

        except BuddyException:
            logger.exception("Buddy exception while restarting host")

        except Exception:
            logger.exception("Unhandled exception")

    @utils.async_scope_log(logger.info)
    async def shutdown_host(self, address: str, buddy_port: int, client_id: str, delay_s: int, timeout: float):
        try:
            async with BuddyClient(address, buddy_port, client_id, timeout) as client:
                await client.shutdown_host(delay_s)

        except BuddyException:
            logger.exception("Buddy exception while shutting down host")

        except Exception:
            logger.exception("Unhandled exception")

    @utils.async_scope_log(logger.info)
    async def suspend_host(self, address: str, buddy_port: int, client_id: str, delay_s: int, timeout: float):
        try:
            async with BuddyClient(address, buddy_port, client_id, timeout) as client:
                await client.suspend_host(delay_s)

        except BuddyException:
            logger.exception("Buddy exception while suspending host")

        except Exception:
            logger.exception("Unhandled exception")

    @utils.async_scope_log(logger.info)
    async def hibernate_host(self, address: str, buddy_port: int, client_id: str, delay_s: int, timeout: float):
        try:
            async with BuddyClient(address, buddy_port, client_id, timeout) as client:
                await client.hibernate_host(delay_s)

        except BuddyException:
            logger.exception("Buddy exception while hibernating host")

        except Exception:
            logger.exception("Unhandled exception")

    @utils.async_scope_log(logger.info)
    async def abort_host_state_change(self, address: str, buddy_port: int, client_id: str, timeout: float):
        try:
            async with BuddyClient(address, buddy_port, client_id, timeout) as client:
                await client.abort_host_state_change()
                return True

        except BuddyException as err:
            if err.result != AbortHostStateChangeResult.BuddyRefused:
                logger.exception("Buddy exception while trying to abort host state change")
            return False

        except Exception:
            logger.exception("Unhandled exception")
            return False

    @utils.async_scope_log(logger.info)
    async def get_moondeckrun_path(self):
        try:
            return str(pathlib.Path(__file__).parent.resolve().joinpath("python", "moondeckrun.sh"))
        except Exception:
            logger.exception("Unhandled exception")
            return None

    @utils.async_scope_log(logger.info)
    async def get_home_dir(self):
        try:
            return str(pathlib.Path.home())
        except Exception:
            logger.exception("Unhandled exception")
            return None

    @utils.async_scope_log(logger.info)
    async def kill_runner(self, app_id: int | None):
        try:
            if app_id is not None:
                logger.info("Killing reaper and moonlight!")
                kill_proc = await asyncio.create_subprocess_shell(f"pkill -f -i \"AppId={app_id}\"",
                                                                  stdout=asyncio.subprocess.PIPE,
                                                                  stderr=asyncio.subprocess.STDOUT)
                output, _ = await kill_proc.communicate()
                if output:
                    newline = "\n"
                    logger.info(f"pkill output: {newline}{output.decode().strip(newline)}")
            else:
                logger.info("Killing moonlight!")

            await MoonlightProxy.terminate_all_instances()

        except Exception:
            logger.exception("Unhandled exception")

    @utils.async_scope_log(logger.info)
    async def is_runner_active(self, app_id: int):
        try:
            kill_proc = await asyncio.create_subprocess_shell(f"pgrep -f -i \"AppId={app_id}\"",
                                                              stdout=asyncio.subprocess.PIPE,
                                                              stderr=asyncio.subprocess.DEVNULL)
            output, _ = await kill_proc.communicate()
            return any(chr.isdigit() for chr in output.decode())

        except Exception:
            logger.exception("Unhandled exception")
            return False

    @utils.async_scope_log(logger.info)
    async def close_steam(self, address: str, buddy_port: int, client_id: str, timeout: float):
        try:
            async with BuddyClient(address, buddy_port, client_id, timeout) as client:
                await client.close_steam()

        except BuddyException:
            logger.exception("Buddy exception while closing steam")

        except Exception:
            logger.exception("Unhandled exception")

    @utils.async_scope_log(logger.info)
    async def end_stream(self, address: str, buddy_port: int, client_id: str, timeout: float):
        try:
            async with BuddyClient(address, buddy_port, client_id, timeout) as client:
                await client.end_stream()

        except BuddyException:
            logger.exception("Buddy exception while ending stream")

        except Exception:
            logger.exception("Unhandled exception")

    @utils.async_scope_log(logger.info)
    async def get_game_stream_app_names(self, address: str, buddy_port: int, client_id: str, timeout: float):
        try:
            async with BuddyClient(address, buddy_port, client_id, timeout) as client:
                return await client.get_game_stream_app_names()

        except BuddyException:
            logger.exception("While retrieving GameStream app names")
            return None

        except Exception:
            logger.exception("Unhandled exception")
            return None

    @utils.async_scope_log(logger.info)
    async def get_non_steam_app_data(self, address: str, buddy_port: int, client_id: str, user_id: str,
                                     buddy_timeout: float, ready_timeout: int):
        try:
            async with BuddyClient(address, buddy_port, client_id, buddy_timeout) as client:
                logger.info(f"Sending request to launch Steam if needed")
                await client.launch_steam(big_picture_mode=False, username=None)

                logger.info("Waiting for Steam to be ready")
                pooler = TimedPooler(timeout=ready_timeout,
                                     exception_on_timeout=BuddyException(Result.SteamDidNotReadyUpInTime))

                async with pooler(await client.notify_on_changes(SteamUiModeResponse, CurrentUserResponse)) as notifications:
                    async for n1, n2 in notifications:
                        mode = n1["mode"]
                        current_user = n2["user"]
                        
                        if mode != SteamUiMode.Unknown or current_user != None:
                            break

                return await client.get_non_steam_app_data(user_id=user_id)

        except BuddyException:
            logger.exception("While retrieving non-Steam app data")
            return None

        except Exception:
            logger.exception("Unhandled exception")
            return None
