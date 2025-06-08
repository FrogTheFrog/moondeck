import asyncio

from typing import cast
from .settingsparser import MoonDeckAppRunnerSettings
from .wolsplashscreen import WolSplashScreen
from ..buddyrequests import AppState, SteamUiMode, StreamState, StreamStateResponse, SteamUiModeResponse, StreamedAppDataResponse
from ..runnerresult import Result, RunnerError
from ..gamestreaminfo import get_server_info
from ..logger import logger
from ..plugin.settings import RunnerTimeouts
from ..moonlightproxy import MoonlightProxy
from ..buddyclient import BuddyClient, BuddyException, HelloResult
from ..utils import TimedPooler


class MoonDeckAppLauncher:
    @staticmethod
    async def wait_for_stream_to_be_ready(client: BuddyClient, timeouts: RunnerTimeouts):
        logger.info("Waiting for Buddy to be ready to launch games")
        pooler = TimedPooler(retries=timeouts["streamReadiness"],
                             exception_on_retry_out=RunnerError(Result.StreamFailedToStart))

        async for req, in pooler(client.get_stream_state):
            state = cast(StreamStateResponse, req)["state"]

            if state == StreamState.Streaming:
                break

    @staticmethod
    async def wait_for_steam_to_be_ready(client: BuddyClient, big_picture_mode: bool, timeouts: RunnerTimeouts):
        logger.info("Waiting for Steam to be ready")
        pooler = TimedPooler(retries=timeouts["steamReadiness"],
                             exception_on_retry_out=RunnerError(Result.SteamDidNotReadyUpInTime))

        desired_mode = SteamUiMode.BigPicture if big_picture_mode else SteamUiMode.Desktop
        async for req, in pooler(client.get_steam_ui_mode):
            mode = cast(SteamUiModeResponse, req)["mode"]
            if mode == desired_mode:
                break

    @staticmethod
    async def wait_for_app_to_be_launched(client: BuddyClient, app_id: str, timeouts: RunnerTimeouts):
        logger.info(f"Waiting for app {app_id} to be launched in Steam")
        pooler = TimedPooler(retries=timeouts["appLaunch"],
                             exception_on_retry_out=RunnerError(Result.AppLaunchFailed))

        app_was_updating = False
        stability_counter = timeouts["appLaunchStability"]
        async for req, in pooler(client.get_streamed_app_data):
            data = cast(StreamedAppDataResponse, req)["data"]
            if data is None:
                raise RunnerError(Result.AppLaunchAborted)

            state = data["app_state"]
            if state == AppState.Updating:
                app_was_updating = True

                # No timeout while the app is updating
                pooler.retries = timeouts["appLaunch"]
            elif state == AppState.Running:
                # If it was updating, but is now running, there's no need to launch it again
                app_was_updating = False

                # Reset the retry counter to the initial value for even more stability...
                pooler.retries = timeouts["appLaunch"]

                # Counter is needed for apps that come with brain-dead launcher (EALink for example)
                stability_counter -= 1

                # Usual the Steam app state changes rapidly with launchers, so if it stays
                # consistent for like 15s, it should be good enough for us
                if stability_counter <= 0:
                    break
            elif app_was_updating:
                # If the app is no longer updating we need to re-launch it by
                # returning this special value
                break
            else:
                # See note above, we are want the app id to stay consistent for some configurable seconds
                stability_counter = timeouts["appLaunchStability"]

        return app_was_updating

    @staticmethod
    async def wait_for_app_to_close(client: BuddyClient):
        logger.info("Waiting for app to close")
        pooler = TimedPooler(retries=1)

        async for req, in pooler(client.get_streamed_app_data):
            data = cast(StreamedAppDataResponse, req)["data"]
            if data is None:
                break

            state = data["app_state"]
            if state == AppState.Stopped:
                break

            # Pool indefinitely
            pooler.retries = 1

    @classmethod
    async def launch(cls, client: BuddyClient, big_picture_mode: bool, app_id: str, timeouts: RunnerTimeouts):
        try:
            await cls.wait_for_stream_to_be_ready(client=client,
                                                  timeouts=timeouts)
            
            logger.info(f"Sending request to launch Steam if needed (forcing big picture mode: {big_picture_mode})")
            await client.launch_steam(big_picture_mode)

            await cls.wait_for_steam_to_be_ready(client=client,
                                                 big_picture_mode=big_picture_mode,
                                                 timeouts=timeouts)

            retry_launch_sequence = True
            while retry_launch_sequence:
                logger.info(f"Sending request to launch app {app_id}")
                await client.launch_app(app_id)
                
                retry_launch_sequence = await cls.wait_for_app_to_be_launched(client=client,
                                                                              app_id=app_id,
                                                                              timeouts=timeouts)

            await cls.wait_for_app_to_close(client=client)

        except Exception as err:
            logger.warning("Ending stream") 
            try:
                await client.end_stream()
            except:
                logger.exception("Failed to end the stream")

            raise err

class MoonDeckAppRunner:
    @staticmethod
    async def check_connectivity(client: BuddyClient, mac: str, host_id: str, host_port: int, timeouts: RunnerTimeouts):
        logger.info("Checking connection to Buddy and GameStream server")

        async with WolSplashScreen(client.address, mac, timeouts["wakeOnLan"]) as splash:
            while True:
                try:
                    await client.say_hello(force=True)
                    buddy_status = True
                except BuddyException as err:
                    buddy_status = False
                    if err.result != HelloResult.Offline:
                        raise RunnerError(err.result)

                server_info = await get_server_info(address=client.address, 
                                                    port=host_port, 
                                                    timeout=timeouts["servicePing"])
                server_status = server_info is not None and server_info["uniqueId"] == host_id
                
                if not splash.update(buddy_status, server_status):
                    if not buddy_status:
                        raise RunnerError(HelloResult.Offline)
                    if not server_status:
                        raise RunnerError(Result.GameStreamDead)
                    return

    @staticmethod
    async def wait_for_initial_conditions(client: BuddyClient, app_id: str, timeouts: RunnerTimeouts):
        logger.info("Waiting for a initial stream conditions to be satisfied")
        
        pooler = TimedPooler(retries=timeouts["initialConditions"])
        async for req1, req2 in pooler(client.get_stream_state, client.get_streamed_app_data):
            state = cast(StreamStateResponse, req1)["state"]
            data = cast(StreamedAppDataResponse, req2)["data"]

            if state == StreamState.StreamEnding:
                pooler.exception_on_retry_out = RunnerError(Result.StreamDidNotEnd)

            if state == StreamState.Streaming:
                if data is None:
                    # Stream is active, but the app was not started for some reason
                    break
                
                if data["app_id"] == app_id:
                    # Already streaming this very app
                    break

                pooler.exception_on_retry_out = RunnerError(Result.AnotherSteamAppIsStreaming)

            # All other states are OK
            break

    @staticmethod
    async def start_moonlight(proxy: MoonlightProxy):
        logger.info("Checking if Moonlight flatpak is installed or custom binary exists")
        if not await proxy.is_moonlight_installed():
            raise RunnerError(Result.MoonlightIsNotInstalled)

        logger.info("Terminating all Moonlight instances if any")
        await proxy.terminate_all_instances(kill_all=True)

        logger.info("Starting Moonlight")
        await proxy.start()

    @staticmethod
    async def wait_for_stream_to_stop(client: BuddyClient, timeouts: RunnerTimeouts):
        logger.info("Waiting for stream to stop")
        pooler = TimedPooler(retries=timeouts["streamEnd"],
                             exception_on_retry_out=RunnerError(Result.StreamDidNotEnd))

        # This is a special case where user can decide not to wait for the stream end
        if pooler.retries <= 0:
            return None

        async for req, in pooler(client.get_stream_state):
            state = cast(StreamStateResponse, req)["state"]

            if state == StreamState.NotStreaming:
                break

    @classmethod
    async def end_successful_stream(cls, client: BuddyClient, close_steam: bool, timeouts: RunnerTimeouts):
        logger.info("App closed gracefully, ending stream if it's still open")
        await client.end_stream()

        if close_steam:
            logger.info("Asking to close Steam if it's still open")
            await client.close_steam()
            
        await cls.wait_for_stream_to_stop(client=client,
                                          timeouts=timeouts)

    @classmethod
    async def run(cls, settings: MoonDeckAppRunnerSettings):
        buddy_client = BuddyClient(
            settings["address"],
            settings["buddy_port"],
            settings["client_id"],
            settings["timeouts"]["buddyRequests"])
        moonlight_proxy = MoonlightProxy(
            settings["hostname"],
            settings["host_app"],
            settings["audio"] if settings["pass_to_moonlight"] else None,
            settings["resolution"] if settings["pass_to_moonlight"] else None,
            settings["moonlight_exec_path"])

        async with buddy_client as client, moonlight_proxy as proxy:
            await cls.check_connectivity(client=client, 
                                         mac=settings["mac"],
                                         host_id=settings["host_id"],
                                         host_port=settings["host_port"],
                                         timeouts=settings["timeouts"])
            await cls.wait_for_initial_conditions(client=client,
                                                  app_id=settings["app_id"],
                                                  timeouts=settings["timeouts"])
            await cls.start_moonlight(proxy=proxy)

            proxy_task = asyncio.create_task(proxy.wait())
            launch_task = asyncio.create_task(MoonDeckAppLauncher.launch(client=client,
                                                                         big_picture_mode=settings["big_picture_mode"],
                                                                         app_id=settings["app_id"],
                                                                         timeouts=settings["timeouts"]))

            done, _ = await asyncio.wait({proxy_task, launch_task}, return_when=asyncio.FIRST_COMPLETED)
            if proxy_task in done:
                done, _ = await asyncio.wait({launch_task}, timeout=2)
                if launch_task in done:
                    launch_task.result()
                else:
                    launch_task.cancel()
                    await asyncio.wait({launch_task}, timeout=2)
                    raise RunnerError(Result.MoonlightClosed)
            else:
                launch_task.result()

            await cls.end_successful_stream(client=client,
                                            close_steam=settings["close_steam"],
                                            timeouts=settings["timeouts"])
