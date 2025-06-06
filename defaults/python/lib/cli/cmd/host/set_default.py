from lib.cli.utils import cmd_entry, host_pattern_matcher, settings_watcher
from lib.cli.settings import CliSettings
from lib.logger import logger


@settings_watcher()
@host_pattern_matcher(match_one=True)
@cmd_entry
async def execute(settings: CliSettings, host_id: str):
    logger.info(f"Default host set to {host_id}")
    settings["defaultHost"] = host_id
    return 0
