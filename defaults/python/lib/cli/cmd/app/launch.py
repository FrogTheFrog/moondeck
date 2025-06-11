from lib.cli.utils import buddy_session, check_connectivity, cmd_entry, host_pattern_matcher, settings_watcher, wol_settings
from lib.buddyclient import BuddyClient
from lib.logger import logger
from lib.runner.moondeckapprunner import MoonDeckAppRunner, MoonDeckAppLauncher
from lib.cli.settings import CliSettings
from lib.utils import wake_on_lan


@settings_watcher()
@host_pattern_matcher(match_one=True)
@wol_settings
@buddy_session()
@cmd_entry
async def execute(buddy_client: BuddyClient, settings: CliSettings, host_id: str, app_id: str,
                  wol_address: str, wol_mac: str, simple: bool, server_timeout: float, ping_timeout: int,
                  bpm: bool, no_stream: bool, no_cleanup: bool, close_steam: bool, precheck_retries: int,
                  stream_rdy_retries: int, steam_rdy_retries: int, stability_retries: int, launch_retries: int,
                  stream_end_retries: int):
    if simple:
         await buddy_client.launch_app(app_id)
         logger.info(f"Buddy has accepted the request to launch {app_id}")
         return 0

    wake_on_lan(address=wol_address, mac=wol_mac)
    if not await check_connectivity(client=buddy_client,
                                    info_port=settings["hosts"][host_id]["infoPort"],
                                    host_id=host_id,
                                    server_timeout=server_timeout,
                                    timeout=ping_timeout):
        logger.error("Buddy or GameStream server did not reach \"online\" state in time!")
        return 1

    await MoonDeckAppRunner.wait_for_initial_conditions(client=buddy_client,
                                                        app_id=app_id,
                                                        timeout=precheck_retries)

    await MoonDeckAppLauncher.launch(client=buddy_client,
                                     big_picture_mode=bpm,
                                     app_id=app_id,
                                     stream_rdy_timeout=stream_rdy_retries,
                                     steam_rdy_timeout=steam_rdy_retries,
                                     stability_timeout=stability_retries,
                                     launch_timeout=launch_retries,
                                     cleanup_on_error=not no_cleanup,
                                     manage_stream=not no_stream)

    if not no_stream:
        await MoonDeckAppRunner.end_successful_stream(client=buddy_client,
                                                      close_steam=close_steam,
                                                      timeout=stream_end_retries)
    else:
        logger.info("Clearing streamed app data") 
        await buddy_client.clear_streamed_app_data()

        if close_steam:
            logger.info("Asking to close Steam if it's still open")
            await buddy_client.close_steam()

    return 0
