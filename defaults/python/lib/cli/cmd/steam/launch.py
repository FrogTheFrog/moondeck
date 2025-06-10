from lib.cli.utils import buddy_session, cmd_entry, host_pattern_matcher, settings_watcher
from lib.buddyclient import BuddyClient
from lib.logger import logger


@settings_watcher()
@host_pattern_matcher(match_one=True)
@buddy_session()
@cmd_entry
async def execute(buddy_client: BuddyClient, bpm: bool):
    await buddy_client.launch_steam(big_picture_mode=bpm)
    logger.info(f"Buddy accepted Steam launch request (force BPM: {bpm})")
    return 0
