import json as jlib

from lib.cli.utils import cmd_entry, host_pattern_matcher, settings_watcher
from lib.cli.settings import CliSettings
from lib.logger import logger

@settings_watcher()
@host_pattern_matcher(match_one=False)
@cmd_entry
async def execute(settings: CliSettings, host_ids: list[str], dry: bool, json: bool):
    if json:
        logger.info(jlib.dumps(host_ids, indent=2))
    else:
        if len(host_ids) == 0:
            logger.info("No hosts matched the pattern")
        else:
            logger.info("Removing hosts:")
            for idx, host_id in enumerate(host_ids):
                logger.info(f"  {host_id}")

    if len(host_ids) == 0:
        return 2
    
    if dry:
        return 0
    
    for host_id in list(settings["hosts"]):
        if host_id in host_ids:
            del settings["hosts"][host_id]
            if host_id == settings["defaultHost"]:
                settings["defaultHost"] = None

    return 0
