from pathlib import Path
from lib.cli.utils import cmd_entry
from lib.hostinfo import scan_for_hosts
from lib.cli.settings import CmdSettingsManager


@cmd_entry
async def execute(settings: CmdSettingsManager, timeout: float, dry: bool, overwrite: bool) -> int:
    hosts = await scan_for_hosts(timeout=timeout)
    print(hosts)
    return 0
