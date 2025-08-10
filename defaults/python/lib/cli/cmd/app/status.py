from typing import TypedDict
from lib.cli.utils import buddy_session, cmd_entry, host_pattern_matcher, settings_watcher
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
async def execute(buddy_client: BuddyClient, app_id: str | None, json: bool):
    resp = await buddy_client.get_streamed_app_data() if app_id is None else await buddy_client.get_app_data(app_id)
    data = AppData({ "status": None })

    if resp["data"]:
        data = AppData({ "status": {
            "appId": resp["data"]["app_id"],
            "appState": resp["data"]["app_state"].name
        }})

    if json:
        # Lazy import to improve CLI performance
        import json as jlib

        logger.info(jlib.dumps(data, indent=2))
    else:
        if data["status"] is None:
            if app_id is None:
                logger.info("There is currently no app that is being monitored by MoonDeck.")
            else:
                logger.info("No app data is available - Steam is probably not running.")
        else:
            logger.info("App monitored by MoonDeck:" if app_id is None else "App data from MoonDeck:")
            logger.info(f"  App ID    : {data["status"]["appId"]}")
            logger.info(f"  App State : {data["status"]["appState"]}")

    return 0
