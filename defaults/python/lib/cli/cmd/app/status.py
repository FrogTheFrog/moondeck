import json as jlib

from typing import TypedDict
from lib.cli.utils import buddy_session, cmd_entry, host_pattern_matcher, settings_watcher, check_connectivity
from lib.buddyclient import BuddyClient
from lib.logger import logger


class AppStatus(TypedDict):
    appId: str
    appState: str


class AppData(TypedDict):
    status: AppStatus | None


@settings_watcher()
@host_pattern_matcher(match_one=True)
@buddy_session()
@cmd_entry
async def execute(buddy_client: BuddyClient, json: bool):
    resp = await buddy_client.get_streamed_app_data()
    data = AppData({ "status": None })

    if resp["data"]:
        data = AppData({ "status": {
            "appId": resp["data"]["app_id"],
            "appState": resp["data"]["app_state"].name
        }})

    if json:
        logger.info(jlib.dumps(data, indent=2))
    else:
        if data["status"] is None:
            logger.info("There is currently no app that is being monitored by MoonDeck.")
        else:
            logger.info("App monitored by MoonDeck:")
            logger.info(F"  App ID    : {data["status"]["appId"]}")
            logger.info(F"  App State : {data["status"]["appState"]}")

    return 0
