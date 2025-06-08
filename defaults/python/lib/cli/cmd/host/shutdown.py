from lib.cli.utils import buddy_session, cmd_entry, host_pattern_matcher, settings_watcher
from lib.buddyclient import BuddyClient, PcStateChange, BuddyException, HelloResult
from lib.logger import logger


@settings_watcher()
@host_pattern_matcher(match_one=True)
@buddy_session()
@cmd_entry
async def execute(buddy_client: BuddyClient):
    try:
        await buddy_client.change_pc_state(PcStateChange.Shutdown)
    except BuddyException as err:
        if err.result != HelloResult.ShuttingDown:
            raise err

    logger.info("Host is shutting down.")
    return 0
