from lib.cli.utils import buddy_session, cmd_entry, host_pattern_matcher, settings_watcher, check_connectivity
from lib.cli.settings import CliSettings
from lib.buddyclient import BuddyClient


@settings_watcher()
@host_pattern_matcher(match_one=True)
@buddy_session()
@cmd_entry
async def execute(buddy_client: BuddyClient, settings: CliSettings, host_id: str, server_timeout: float, timeout: int, inverse: bool):
    if await check_connectivity(client=buddy_client,
                                info_port=settings["hosts"][host_id]["infoPort"],
                                host_id=host_id,
                                server_timeout=server_timeout,
                                timeout=timeout,
                                inverse=inverse):
        return 0

    return 1
