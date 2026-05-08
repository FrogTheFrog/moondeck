from typing import TypedDict
from lib.cli.utils import buddy_session, cmd_entry, host_pattern_matcher, settings_watcher
from lib.buddyclient import BuddyClient
from lib.buddyrequests import SteamUiMode
from lib.logger import logger


class SteamStatus(TypedDict):
    running: bool
    bpm: bool | None
    user_id: str | None


class SteamData(TypedDict):
    status: SteamStatus


@settings_watcher()
@host_pattern_matcher(match_one=True)
@buddy_session()
@cmd_entry
async def execute(buddy_client: BuddyClient, json: bool):
    resp1 = await buddy_client.get_steam_ui_mode()
    resp2 = await buddy_client.get_current_user()
    data = SteamData({ "status": SteamStatus({ 
        "running": resp2["user"] is not None,
        "bpm": None if resp1["mode"] == SteamUiMode.Unknown else resp1["mode"] == SteamUiMode.BigPicture,
        "user_id": resp2["user"] and resp2["user"]["id"]
    })})

    if json:
        # Lazy import to improve CLI performance
        import json as jlib

        logger.info(jlib.dumps(data, indent=2))
    else:
        logger.info("Steam status:")
        logger.info(f"  Running          : {data["status"]["running"]}")
        logger.info(f"  Big Picture Mode : {data["status"]["bpm"]}")
        logger.info(f"  User Id          : {data["status"]["user_id"]}")

    return 0
