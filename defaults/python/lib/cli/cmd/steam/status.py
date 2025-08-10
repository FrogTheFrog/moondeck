from typing import TypedDict
from lib.cli.utils import buddy_session, cmd_entry, host_pattern_matcher, settings_watcher
from lib.buddyclient import BuddyClient
from lib.buddyrequests import SteamUiMode
from lib.logger import logger


class SteamStatus(TypedDict):
    running: bool
    bpm: bool


class SteamData(TypedDict):
    status: SteamStatus


@settings_watcher()
@host_pattern_matcher(match_one=True)
@buddy_session()
@cmd_entry
async def execute(buddy_client: BuddyClient, json: bool):
    resp = await buddy_client.get_steam_ui_mode()
    data = SteamData({ "status": SteamStatus({ 
        "running": resp["mode"] != SteamUiMode.Unknown,
        "bpm": resp["mode"] == SteamUiMode.BigPicture
    })})

    if json:
        # Lazy import to improve CLI performance
        import json as jlib

        logger.info(jlib.dumps(data, indent=2))
    else:
        logger.info("Steam status:")
        logger.info(f"  Running          : {data["status"]["running"]}")
        logger.info(f"  Big Picture Mode : {data["status"]["bpm"]}")

    return 0
