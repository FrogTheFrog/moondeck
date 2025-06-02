import json as jlib

from typing import Optional, TypedDict
from lib.cli.utils import cmd_entry, settings_watcher
from lib.cli.settings import CliSettings
from lib.logger import logger


class PrintableHostInfo(TypedDict):
    manualEntry: bool
    defaultHost: bool
    id: str
    address: str
    infoPort: int
    buddyPort: Optional[int]
    hostName: str
    mac: Optional[str]


def convert_settings_to_host_info(settings: CliSettings):
    info: list[PrintableHostInfo] = []
    for k, v in settings["hosts"].items():
        info.append(PrintableHostInfo({
            "manualEntry": v["manualAddress"],
            "defaultHost": settings["defaultHost"] == k,
            "id": k,
            "address": v["address"],
            "infoPort": v["infoPort"],
            "buddyPort": v["buddyPort"],
            "hostName": v["hostName"],
            "mac": v["mac"]
        }))
    return info


def log_host_info(info: PrintableHostInfo):
    logger.info(f"  Manual Entry : {info["manualEntry"]}")
    logger.info(f"  Default Host : {info["defaultHost"]}")
    logger.info(f"  ID           : {info["id"]}")
    logger.info(f"  Address      : {info["address"]}")
    logger.info(f"  Info Port    : {info["infoPort"]}")
    logger.info(f"  Buddy Port   : {info["buddyPort"]}")
    logger.info(f"  Host Name    : {info["hostName"]}")
    logger.info(f"  MAC          : {info["mac"]}")


@settings_watcher(dry=True)
@cmd_entry
async def execute(settings: CliSettings, json: bool):
    host_info = convert_settings_to_host_info(settings)
    if json:
        logger.info(jlib.dumps(host_info, indent=2))
    else:
        if len(host_info) == 0:
            logger.info("There are no saved hosts")
        else:
            logger.info("Saved hosts:")
            for idx, host in enumerate(host_info):
                log_host_info(host)
                if idx + 1 != len(host_info):
                    logger.info("  ----")

    return 0
