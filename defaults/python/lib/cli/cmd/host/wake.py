from lib.cli.utils import cmd_entry, host_pattern_matcher, settings_watcher
from lib.cli.settings import CliSettings
from lib.logger import logger
from lib.utils import wake_on_lan


@settings_watcher()
@host_pattern_matcher(match_one=True)
@cmd_entry
async def execute(settings: CliSettings, host_id: str):
    address = settings["hosts"][host_id]["address"]
    mac = settings["hosts"][host_id]["mac"]
    if mac is None:
        logger.error("Host has not been paired yet or the MAC was not synced!")
        return 1
    
    wake_on_lan(address=address, mac=mac)
    return 0
