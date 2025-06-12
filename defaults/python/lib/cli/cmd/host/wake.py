from lib.cli.utils import cmd_entry, host_pattern_matcher, settings_watcher, wol_settings
from lib.utils import wake_on_lan


@settings_watcher()
@host_pattern_matcher(match_one=True)
@wol_settings
@cmd_entry
async def execute(wol_address: str, wol_mac: str):    
    wake_on_lan(address=wol_address, mac=wol_mac)
    return 0
