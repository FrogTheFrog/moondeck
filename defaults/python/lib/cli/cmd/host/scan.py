import json as jlib

from lib.cli.utils import cmd_entry, settings_watcher
from lib.gamestreaminfo import scan_for_hosts
from lib.cli.settings import CliSettings
from lib.logger import logger

@settings_watcher
@cmd_entry
async def execute(settings: CliSettings, timeout: float, dry: bool, json: bool, prune: bool):
    hosts = await scan_for_hosts(timeout=timeout)
    if json:
        logger.info(jlib.dumps(hosts, indent=2))
    else:
        if len(hosts) == 0:
            logger.info("No hosts were found")
        else:
            logger.info(f"Available hosts:")
            for idx, host in enumerate(hosts):
                logger.info(f"  ID       : {host['uniqueId']}")
                logger.info(f"  HostName : {host['hostName']}")
                logger.info(f"  Address  : {host['address']}")
                logger.info(f"  Port     : {host['port']}")
                if idx + 1 != len(hosts):
                    logger.info("  ----")
    
    if dry:
        return 0
    
    for host in hosts:
        host_id = host["uniqueId"]
        if host_id in settings["hosts"]:
            if not settings["hosts"][host_id]["manualAddress"]:
                settings["hosts"][host_id]["address"] = host["address"]
                settings["hosts"][host_id]["infoPort"] = host["port"]
                settings["hosts"][host_id]["hostName"] = host["hostName"]
        else:
            settings["hosts"][host_id] = {
                "address": host["address"],
                "buddyPort": None,
                "hostName": host["hostName"],
                "infoPort": host["port"],
                "mac": None,
                "manualAddress": False
            }

    if prune:
        for host_id, host in list(settings["hosts"].items()):
            if not any([host_id == x["uniqueId"] for x in hosts]):
                del settings["hosts"][host_id]
                if host_id == settings["defaultHost"]:
                    settings["defaultHost"] = None

    return 0
