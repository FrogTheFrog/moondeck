from lib.cli.utils import buddy_session, cmd_entry, host_pattern_matcher, settings_watcher
from lib.buddyclient import BuddyClient
from lib.logger import logger


@settings_watcher()
@host_pattern_matcher(match_one=True)
@buddy_session()
@cmd_entry
async def execute(buddy_client: BuddyClient):
    await buddy_client.clear_streamed_app_data()
    logger.info("Monitored app cleared on Buddy")
    return 0
