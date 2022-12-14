# autopep8: off
def get_plugin_dir():
    from pathlib import Path
    return Path(__file__).parent.resolve()

def add_plugin_to_path():
    import sys

    plugin_dir = get_plugin_dir()
    directories = [["./"], ["python"], ["python", "lib"], ["python", "externals"]]
    for dir in directories:
        sys.path.append(str(plugin_dir.joinpath(*dir)))

add_plugin_to_path()

import asyncio
import python.lib.runnerresult as runnerresult
import python.lib.hostinfo as hostinfo
import python.lib.constants as constants
import python.lib.utils as utils

from typing import Any, Dict
from python.lib.settings import settings_manager, UserSettings
from python.lib.logger import logger, set_log_filename
from python.lib.buddyclient import BuddyClient, HelloResult, PcStateChange
from python.externals.wakeonlan import send_magic_packet
# autopep8: on

set_log_filename(constants.LOG_FILE)


class Plugin:
    async def get_runner_result(self):
        result = runnerresult.get_result()
        # Cleanup is needed to differentiate between moondeck launches
        runnerresult.set_result(None)
        return result

    async def get_user_settings(self):
        try:
            return await settings_manager.get()
        except Exception:
            logger.exception("Unhandled exception")
            return None

    async def set_user_settings(self, data: Dict[str, Any]):
        try:
            await settings_manager.set(utils.from_dict(UserSettings, data))
        except Exception:
            logger.exception("Unhandled exception")

    async def scan_for_hosts(self, timeout: float):
        try:
            return await hostinfo.scan_for_hosts(timeout=timeout)
        except Exception:
            logger.exception("Unhandled exception")
            return []

    async def find_host(self, host_id: str, timeout: float):
        try:
            return await hostinfo.find_host(host_id, timeout=timeout)
        except Exception:
            logger.exception("Unhandled exception")
            return None

    async def get_server_info(self, address: str, timeout: float):
        try:
            return await hostinfo.get_server_info(address, timeout=timeout)
        except Exception:
            logger.exception("Unhandled exception")
            return None

    async def get_buddy_status(self, address: str, buddy_port: int, client_id: str, timeout: float):
        try:
            async with BuddyClient(address, buddy_port, client_id, timeout) as client:
                status = await client.say_hello()
                if status:
                    return status.name

                return "Online"

        except Exception:
            logger.exception("Unhandled exception")
            return HelloResult.Exception.name

    async def start_pairing(self, address: str, buddy_port: int, client_id: str, pin: int, timeout: float):
        try:
            async with BuddyClient(address, buddy_port, client_id, timeout) as client:
                status = await client.start_pairing(pin)
                if status:
                    return status.name

                return "PairingStarted"

        except Exception:
            logger.exception("Unhandled exception")
            return HelloResult.Exception.name

    async def abort_pairing(self, address: str, buddy_port: int, client_id: str, timeout: float):
        try:
            async with BuddyClient(address, buddy_port, client_id, timeout) as client:
                status = await client.abort_pairing()
                if status:
                    logger.error(f"While aborting pairing: {status}")

        except Exception:
            logger.exception("Unhandled exception")

    async def wake_on_lan(self, address: str, mac: str):
        try:
            # Sending broadcast as well as directly to address
            send_magic_packet(mac)
            send_magic_packet(mac, ip_address=address)
        except Exception:
            logger.exception("Unhandled exception")

    async def change_pc_state(self, address: str, buddy_port: int, client_id: str, state: str, timeout: float):
        try:
            state_enum = PcStateChange[state]
            async with BuddyClient(address, buddy_port, client_id, timeout) as client:
                status = await client.change_pc_state(state_enum, 10)
                if status:
                    logger.error(f"While changing PC state to {state}: {status}")

        except Exception:
            logger.exception("Unhandled exception")

    async def get_moondeckrun_path(self):
        try:
            return str(get_plugin_dir().joinpath("python", "moondeckrun.sh"))
        except Exception:
            logger.exception("Unhandled exception")

    async def kill_runner(self, app_id: int):
        try:
            logger.info("Killing reaper and moonlight!")
            kill_proc = await asyncio.create_subprocess_shell(f"pkill -f -e \"AppId={app_id}|moonlight\"",
                                                              stdout=asyncio.subprocess.PIPE,
                                                              stderr=asyncio.subprocess.STDOUT)
            output, _ = await kill_proc.communicate()
            logger.info(f"pkill output: {output}")

        except Exception:
            logger.exception("Unhandled exception")

    async def is_runner_active(self, app_id: int):
        try:
            kill_proc = await asyncio.create_subprocess_shell(f"pgrep -f \"AppId={app_id}\"",
                                                              stdout=asyncio.subprocess.PIPE,
                                                              stderr=asyncio.subprocess.DEVNULL)
            output, _ = await kill_proc.communicate()
            return any(chr.isdigit() for chr in output.decode("utf-8"))

        except Exception:
            logger.exception("Unhandled exception")

    async def close_steam(self, address: str, buddy_port: int, client_id: str, timeout: float):
        try:
            async with BuddyClient(address, buddy_port, client_id, timeout) as client:
                status = await client.close_steam(None)
                if status:
                    logger.error(f"While closing Steam on host PC: {status}")

        except Exception:
            logger.exception("Unhandled exception")
