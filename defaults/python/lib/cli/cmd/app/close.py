from lib.cli.utils import buddy_session, cmd_entry, host_pattern_matcher, settings_watcher
from lib.buddyclient import BuddyClient
from lib.logger import logger


@settings_watcher()
@host_pattern_matcher(match_one=True)
@buddy_session()
@cmd_entry
async def execute(buddy_client: BuddyClient, app_id: str):
    await buddy_client.close_app(app_id)
    logger.info(f"Buddy will try to close Steam app {app_id}")
    return 0
