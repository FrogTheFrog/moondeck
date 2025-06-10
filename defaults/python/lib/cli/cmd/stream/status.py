import json as jlib

from typing import TypedDict
from lib.cli.utils import buddy_session, cmd_entry, host_pattern_matcher, settings_watcher
from lib.buddyclient import BuddyClient
from lib.logger import logger


class StreamStatus(TypedDict):
    streamState: str


class StreamData(TypedDict):
    status: StreamStatus


@settings_watcher()
@host_pattern_matcher(match_one=True)
@buddy_session()
@cmd_entry
async def execute(buddy_client: BuddyClient, json: bool):
    resp = await buddy_client.get_stream_state()
    data = StreamData({ "status": StreamStatus({ "streamState": resp["state"].name }) })

    if json:
        logger.info(jlib.dumps(data, indent=2))
    else:
        logger.info("MoonDeckStream status:")
        logger.info(f"  Stream State : {data["status"]["streamState"]}")

    return 0
