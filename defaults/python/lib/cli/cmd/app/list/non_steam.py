from lib.cli.utils import buddy_session, cmd_entry, host_pattern_matcher, settings_watcher
from lib.buddyclient import BuddyClient
from lib.logger import logger
from lib.buddyrequests import NonSteamAppDataItem


def convert_to_sorted_dict(apps: list[NonSteamAppDataItem]):
    apps.sort(key=lambda item: item["app_name"])
    return { item["app_id"]: item["app_name"] for item in apps }


@settings_watcher()
@host_pattern_matcher(match_one=True)
@buddy_session()
@cmd_entry
async def execute(buddy_client: BuddyClient, user_id: str, json: bool):
    apps = await buddy_client.get_non_steam_app_data(user_id)
    if apps is not None:
        apps = convert_to_sorted_dict(apps)
        if json:
            # Lazy import to improve CLI performance
            import json as jlib

            logger.info(jlib.dumps(apps, indent=2))
        else:
            if len(apps) == 0:
                logger.info("There are no non-Steam apps")
            else:
                logger.info("Non-Steam apps:")
                for app_id, app_name in apps.items():
                    logger.info(f"  {app_id} : {app_name}")

    if apps is None:
        logger.info(f"Failed to get non-Steam apps for user {user_id}!")
        return 1

    return 0
