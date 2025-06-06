from lib.cli.utils import cmd_entry, settings_watcher
from lib.cli.settings import CliSettings
from lib.logger import logger


@settings_watcher()
@cmd_entry
async def execute(settings: CliSettings):
    logger.info(f"Default host set to None")
    settings["defaultHost"] = None
    return 0
