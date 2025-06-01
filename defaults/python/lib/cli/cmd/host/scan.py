from lib.cli.utils import cmd_entry, settings_watcher
from lib.gamestreaminfo import scan_for_hosts
from lib.cli.settings import CliSettings

@settings_watcher
@cmd_entry
async def execute(settings: CliSettings, timeout: float, dry: bool, overwrite: bool) -> int:
    print(settings)
    return 0
