import json as jlib

from lib.cli.utils import cmd_entry, log_gamestream_host, settings_watcher
from lib.gamestreaminfo import get_server_info
from lib.cli.settings import CliSettings
from lib.logger import logger

@settings_watcher
@cmd_entry
async def execute(settings: CliSettings, timeout: float, dry: bool, json: bool, address: str, port: int):
    host = await get_server_info(address=address, port=port, timeout=timeout)
    if json:
        logger.info(jlib.dumps(host, indent=2))
    else:
        if host is None:
            logger.info("Could not reach the host")
        else:
            logger.info(f"Available host:")
            log_gamestream_host(host)
    
    if host is None:
        return 1

    if dry:
        return 0
    
    host_id = host["uniqueId"]
    if host_id in settings["hosts"]:
        settings["hosts"][host_id]["address"] = host["address"]
        settings["hosts"][host_id]["infoPort"] = host["port"]
        settings["hosts"][host_id]["hostName"] = host["hostName"]
        settings["hosts"][host_id]["manualAddress"] = True
    else:
        settings["hosts"][host_id] = {
            "address": host["address"],
            "buddyPort": None,
            "hostName": host["hostName"],
            "infoPort": host["port"],
            "mac": None,
            "manualAddress": True
        }

    return 0
