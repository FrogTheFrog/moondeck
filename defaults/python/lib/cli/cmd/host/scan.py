from pathlib import Path
from lib.cli.utils import ignore_unmatched_kwargs


@ignore_unmatched_kwargs
async def execute(config_file: Path, timeout: float, dry: bool, overwrite: bool) -> int:
    return 0
