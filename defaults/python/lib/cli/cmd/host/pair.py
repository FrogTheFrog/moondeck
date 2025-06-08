import asyncio

from lib.cli.utils import buddy_session, cmd_entry, host_pattern_matcher, settings_watcher
from lib.cli.settings import CliSettings
from lib.logger import logger
from lib.buddyclient import BuddyClient, BuddyException, HelloResult, PairingResult


@settings_watcher()
@host_pattern_matcher(match_one=True)
@buddy_session()
@cmd_entry
async def execute(buddy_client: BuddyClient, settings: CliSettings, host_id: str, buddy_port: int, pin: int):
    try:
        try:
            await buddy_client.start_pairing(pin)
            logger.info(f"Enter pin {pin} on host in Buddy's pop window to complete pairing.")
        except BuddyException as err:
            if err.result != PairingResult.AlreadyPaired:
                logger.error(f"Could not start pairing: {err}")
                return 1
            else:
                logger.info("Client is already paired - updating Buddy port only.")
        
        if not buddy_client.hello_was_ok:
            logger.info("Waiting for pairing to finish...")
            while True:
                try:
                    await buddy_client.say_hello()
                    logger.info("Pairing has been completed.")
                    break
                except BuddyException as err:
                    if err.result == HelloResult.Pairing:
                        await asyncio.sleep(1)
                        continue

                    if err.result == HelloResult.NotPaired:
                        logger.error("Pairing was aborted or timed out!")
                        return 1
                    
                    logger.error(f"Could not finish pairing: {err}")
                    return 1

        # This is the only place where this can be updated
        settings["hosts"][host_id]["buddyPort"] = buddy_port
        return 0
    except asyncio.CancelledError as err:
        try:
            logger.info("Aborting pairing...")
            await buddy_client.abort_pairing()
        except Exception:
            logger.debug("Exception while aborting pairing.", exc_info=True)

        raise err
