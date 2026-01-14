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
import pathlib
import lib.gamestreaminfo as gamestreaminfo
import lib.constants as constants
import lib.utils as utils

from typing import Optional, cast
from lib.plugin.settings import UserSettings, UserSettingsManager
from lib.logger import logger, set_logger_settings
from lib.buddyrequests import SteamUiMode, SteamUiModeResponse
from lib.buddyclient import BuddyClient, PcStateChange, BuddyException
from lib.utils import wake_on_lan, change_moondeck_runner_ready_state, TimedPooler
from lib.runnerresult import Result, set_result, get_result


set_logger_settings(constants.LOG_FILE, rotate=True)
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

    @utils.async_scope_log(logger.info)
    async def set_runner_ready(self):
        change_moondeck_runner_ready_state(True)

    @utils.async_scope_log(logger.info)
    async def get_runner_result(self):
        result = get_result()
        # Cleanup is needed to differentiate between moondeck launches
        set_result(None)
        return result

    @utils.async_scope_log(logger.info)
    async def get_user_settings(self):
        try:
            return await settings_manager.read_or_update()
        except Exception:
            logger.exception("Failed to get user settings")
            return None

    @utils.async_scope_log(logger.info)
    async def set_user_settings(self, data: UserSettings):
        try:
            await settings_manager.write(data)
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
    async def wake_on_lan(self, hostname: str, address: str, mac: str, custom_exec: Optional[str]):
        try:
            await wake_on_lan(hostname, address, mac, custom_exec)
        except Exception:
            logger.exception("Unhandled exception")

    @utils.async_scope_log(logger.info)
    async def change_pc_state(self, address: str, buddy_port: int, client_id: str, state: str, timeout: float):
        try:
            state_enum = PcStateChange[state]
            async with BuddyClient(address, buddy_port, client_id, timeout) as client:
                await client.change_pc_state(state_enum, 10)

        except BuddyException:
            logger.exception(f"Buddy exception while changing PC state to {state}")

        except Exception:
            logger.exception("Unhandled exception")

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
    async def kill_runner(self, app_id: int):
        try:
            logger.info("Killing reaper and moonlight!")
            kill_proc = await asyncio.create_subprocess_shell(f"pkill -f -e -i \"AppId={app_id}|moonlight\"",
                                                              stdout=asyncio.subprocess.PIPE,
                                                              stderr=asyncio.subprocess.STDOUT)
            output, _ = await kill_proc.communicate()
            newline = "\n"
            logger.info(f"pkill output: {newline}{output.decode().strip(newline)}")

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
                await client.launch_steam(big_picture_mode=False)

                logger.info("Waiting for Steam to be ready")
                pooler = TimedPooler(retries=ready_timeout,
                                     exception_on_retry_out=BuddyException(Result.SteamDidNotReadyUpInTime))

                async for req, in pooler(client.get_steam_ui_mode):
                    mode = cast(SteamUiModeResponse, req)["mode"]
                    if mode != SteamUiMode.Unknown:
                        break

                return await client.get_non_steam_app_data(user_id=user_id)

        except BuddyException:
            logger.exception("While retrieving non-Steam app data")
            return None

        except Exception:
            logger.exception("Unhandled exception")
            return None
