from lib.cli.utils import buddy_session, cmd_entry, host_pattern_matcher, settings_watcher
from lib.buddyclient import BuddyClient, PcStateChange, BuddyException, HelloResult
from lib.logger import logger


@settings_watcher()
@host_pattern_matcher(match_one=True)
@buddy_session()
@cmd_entry
async def execute(buddy_client: BuddyClient, delay: int):
    try:
        await buddy_client.change_pc_state(PcStateChange.Suspend, delay)
    except BuddyException as err:
        if err.result != HelloResult.Suspending:
            raise err

    logger.info("Host is suspending.")
    return 0
