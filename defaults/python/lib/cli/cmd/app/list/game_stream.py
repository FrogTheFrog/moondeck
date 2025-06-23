import json as jlib

from lib.cli.utils import buddy_session, cmd_entry, host_pattern_matcher, settings_watcher
from lib.buddyclient import BuddyClient
from lib.logger import logger


@settings_watcher()
@host_pattern_matcher(match_one=True)
@buddy_session()
@cmd_entry
async def execute(buddy_client: BuddyClient, json: bool):
    apps = await buddy_client.get_game_stream_app_names()
    if apps is not None:
        if json:
            logger.info(jlib.dumps(apps, indent=2))
        else:
            if len(apps) == 0:
                logger.info("There are no GameStream apps")
            else:
                logger.info("GameStream apps:")
                for app_name in apps:
                    logger.info(f"  {app_name}")

    if apps is None:
        logger.info(f"Failed to get GameStream app list!")
        return 1

    return 0
