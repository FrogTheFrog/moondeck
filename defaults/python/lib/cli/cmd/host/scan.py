from pathlib import Path
from lib.cli.utils import cmd_entry
from lib.hostinfo import scan_for_hosts


@cmd_entry
async def execute(config_file: Path, timeout: float, dry: bool, overwrite: bool) -> int:
    hosts = await scan_for_hosts(timeout=timeout)
    print(hosts)
    return 0
