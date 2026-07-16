from typing import Optional

from .settingsparser import MoonDeckAppRunnerSettings, CloseSteam, SteamUser
from ..buddyrequests import AppState, CurrentUserResponse, SteamUiMode, StreamState, StreamStateResponse, SteamUiModeResponse, StreamedAppDataResponse
from ..runnerresult import Result, RunnerError
from ..gamestreaminfo import get_server_info
from ..logger import logger
from ..moonlightproxy import CommandLineOptions, MoonlightProxy
from ..buddyclient import BuddyClient, HelloResult
from ..buddyrequests import BuddyException
from ..utils import TimedPooler
from ..splashscreen.overlay import OverlayStack


class MoonDeckAppLauncher:
    @staticmethod
    async def wait_for_stream_to_be_ready(client: BuddyClient, timeout: int):
        logger.info("Waiting for Buddy to be ready to launch games")
        pooler = TimedPooler(timeout=timeout,
                             exception_on_timeout=RunnerError(Result.StreamFailedToStart))

        async with pooler(await client.notify_on_changes(StreamStateResponse)) as notifications:
            async for n1, in notifications:
                state = n1["state"]

                if state == StreamState.Streaming:
                    break

    @staticmethod
    async def wait_for_steam_user_switch_to_be_ready(client: BuddyClient, user_id: str, timeout: int):
        logger.info(f"Waiting for Steam to be ready to switch to user {user_id} if needed")
        pooler = TimedPooler(timeout=timeout,
                             exception_on_timeout=RunnerError(Result.SteamUserSwitchNotReadyInTime))

        async with pooler(await client.notify_on_changes(CurrentUserResponse)) as notifications:
            steam_close_request_sent = False
            async for n1, in notifications:
                current_user = n1["user"]
                current_user_id = current_user and current_user["id"]

                if current_user_id == user_id:
                    break

                if current_user is None:
                    # Steam is not running
                    break

                if not steam_close_request_sent:
                    await client.close_steam(keep_stream_alive=True)
                    steam_close_request_sent = True

    @staticmethod
    async def wait_for_steam_to_be_ready(client: BuddyClient, big_picture_mode: bool, user_id: str | None, can_retry_user_switch: bool, timeout: int):
        logger.info("Waiting for Steam to be ready")
        stuck_null_user_wait_timeout = 5
        pooler = TimedPooler(timeout=max(stuck_null_user_wait_timeout, timeout),
                             exception_on_timeout=RunnerError(Result.SteamDidNotReadyUpInTime))

        async with pooler(await client.notify_on_changes(SteamUiModeResponse, CurrentUserResponse)) as notifications:
            desired_mode = SteamUiMode.BigPicture if big_picture_mode else SteamUiMode.Desktop
            last_user_wait_ts = None
            async for n1, n2 in notifications:
                mode = n1["mode"]
                current_user = n2["user"]
                current_user_id = current_user and current_user["id"]

                if user_id is None:
                    # Any logged-in user will do, but it must be logged-in
                    if current_user_id is None:
                        continue
                elif current_user:
                    if current_user_id is None:
                        now = notifications.yield_time
                        last_user_wait_ts = last_user_wait_ts or now
                        elapsed_time = now - last_user_wait_ts
                        remaining_wait_time = stuck_null_user_wait_timeout - elapsed_time
                        
                        if remaining_wait_time > 0:
                            notifications.repeat_timeout = remaining_wait_time
                            continue

                    if current_user_id != user_id:
                        if can_retry_user_switch:
                            return True
                        else:
                            continue

                if mode == desired_mode:
                    break

        return False

    @staticmethod
    async def wait_for_app_to_be_launched(client: BuddyClient, app_id: str, stability_timeout: int, launch_timeout: int):
        logger.info(f"Waiting for app {app_id} to be launched in Steam")
        pooler = TimedPooler(timeout=launch_timeout,
                             exception_on_timeout=RunnerError(Result.AppLaunchFailed))

        async with pooler(await client.notify_on_changes(StreamedAppDataResponse)) as notifications:
            app_was_updating = False
            async for n1, in notifications:
                data = n1["data"]
                if data is None:
                    raise RunnerError(Result.AppLaunchAborted)

                state = data["app_state"]
                if state == AppState.Updating:
                    app_was_updating = True

                    # No timeout while the app is updating
                    notifications.timeout = launch_timeout
                    notifications.repeat_timeout = None
                elif state == AppState.Running:
                    # If it was updating, but is now running, there's no need to launch it again
                    app_was_updating = False

                    # Reset the retry counter to the initial value for even more stability...
                    notifications.timeout = launch_timeout

                    # Counter is needed for apps that come with brain-dead launcher (EALink for example)
                    if notifications.repeat_timeout is None:
                        notifications.repeat_timeout = stability_timeout
                    else:
                        # Usual the Steam app state changes rapidly with launchers, so if it stays
                        # consistent for like 15s, it should be good enough for us
                        break
                else:
                    if app_was_updating:
                        # If the app is no longer updating we need to re-launch it by
                        # returning this special value
                        break

                    # See note above, we are want the app id to stay consistent for some configurable seconds,
                    # so the repeat timeout will only be enabled again in case the app is running
                    notifications.repeat_timeout = None

        return app_was_updating

    @staticmethod
    async def wait_for_app_to_close(client: BuddyClient):
        logger.info("Waiting for app to close")
        pooler = TimedPooler(timeout=None)

        async with pooler(await client.notify_on_changes(StreamedAppDataResponse)) as notifications:
            async for n1, in notifications:
                data = n1["data"]
                if data is None:
                    break

                state = data["app_state"]
                if state == AppState.Stopped:
                    break

    @classmethod
    async def launch(cls, client: BuddyClient, big_picture_mode: bool, app_id: str, user: SteamUser | None, stream_rdy_timeout: int, steam_rdy_timeout: int, stability_timeout: int, launch_timeout: int, user_switch_timeout: int, cleanup_on_error: bool, manage_stream: bool):
        # Lazy import to improve CLI performance
        import asyncio
        from .. import constants

        try:
            if manage_stream:
                await cls.wait_for_stream_to_be_ready(client=client,
                                                      timeout=stream_rdy_timeout)
            
            can_retry_user_switch = True
            while can_retry_user_switch:
                if user:
                    await cls.wait_for_steam_user_switch_to_be_ready(client=client,
                                                                     user_id=user["id"],
                                                                     timeout=user_switch_timeout)

                logger.info(f"Sending request to launch Steam if needed (forcing big picture mode: {big_picture_mode}, specified user: {user})")
                await client.launch_steam(big_picture_mode, user and user["name"])

                can_retry_user_switch = await cls.wait_for_steam_to_be_ready(client=client,
                                                                             big_picture_mode=big_picture_mode,
                                                                             user_id=user and user["id"],
                                                                             can_retry_user_switch=can_retry_user_switch,
                                                                             timeout=steam_rdy_timeout)

            retry_launch_sequence = True
            while retry_launch_sequence:
                logger.info(f"Sending request to launch app {app_id}")
                await client.launch_app(app_id)
                
                retry_launch_sequence = await cls.wait_for_app_to_be_launched(client=client,
                                                                              app_id=app_id,
                                                                              stability_timeout=stability_timeout,
                                                                              launch_timeout=launch_timeout)

            await cls.wait_for_app_to_close(client=client)

        except BaseException as err:
            is_being_suspended = isinstance(err, asyncio.CancelledError) \
                                 and err.args and err.args[0] == constants.RUNNER_SUSPEND_CANCEL_MSG

            if cleanup_on_error and not is_being_suspended:
                if manage_stream:
                    try:
                        logger.warning("Ending stream") 
                        await client.end_stream()
                    except Exception:
                        logger.exception("Failed to end the stream")
                else:
                    try:
                        logger.warning("Clearing streamed app data") 
                        await client.clear_streamed_app_data()
                    except Exception:
                        logger.exception("Failed to clear streamed app data")

            raise err

class MoonDeckAppRunner:
    @staticmethod
    async def check_connectivity(client: BuddyClient, overlay_stack: OverlayStack, mac: str, host_id: str, hostname: str, host_port: int, wol_port: int, custom_wol_exec: Optional[str], wol_timeout: int, server_timeout: int):
        logger.info("Checking connection to Buddy and GameStream server")

        # Lazy import to improve CLI performance
        from .wolsplashscreen import WolSplashScreen

        async with WolSplashScreen(overlay_stack, client.address, mac, wol_timeout, hostname, wol_port, custom_wol_exec) as splash:
            while True:
                try:
                    await client.say_hello(force=True)
                    buddy_status = True
                except BuddyException as err:
                    buddy_status = False

                    if err.result in BuddyClient.CAN_BE_ABORTED_STATES:
                        try:
                            await client.abort_host_state_change()
                        except BuddyException as abort_err:
                            # this is irrelevant exception and subject to all sort of race conditions
                            # so we just log it
                            logger.info(f"Failed to abort host state change: {abort_err}")
                    elif err.result != HelloResult.Offline:
                        raise RunnerError(err.result)

                server_info = await get_server_info(address=client.address, 
                                                    port=host_port, 
                                                    timeout=server_timeout)
                server_status = server_info is not None and server_info["uniqueId"] == host_id
                
                if not await splash.update(buddy_status, server_status):
                    if not buddy_status:
                        raise RunnerError(HelloResult.Offline)
                    if not server_status:
                        raise RunnerError(Result.GameStreamDead)
                    return

    @staticmethod
    async def wait_for_initial_conditions(client: BuddyClient, app_id: str, user_id: str | None, timeout: int):
        logger.info("Waiting for a initial stream conditions to be satisfied")
        pooler = TimedPooler(timeout=timeout,
                             exception_on_timeout=RunnerError(Result.BuddyDidNotRespond))

        async with pooler(await client.notify_on_changes(StreamStateResponse, StreamedAppDataResponse, CurrentUserResponse)) as notifications:
            async for n1, n2, n3 in notifications:
                state = n1["state"]
                data = n2["data"]
                current_user = n3["user"]
                current_user_id = current_user and current_user["id"]

                if state == StreamState.StreamEnding:
                    notifications.exception_on_timeout = RunnerError(Result.StreamDidNotEnd)

                if state == StreamState.Streaming:
                    if data is None:
                        # Stream is active, but the app was not started for some reason
                        break
                    
                    if data["app_id"] == app_id and (user_id is None or current_user_id == user_id):
                        # Already streaming this very app via the same account
                        break

                    notifications.exception_on_timeout = RunnerError(Result.AnotherSteamAppIsStreaming)

                # All other states are OK
                break

    @staticmethod
    async def start_moonlight(proxy: MoonlightProxy, hostname: str, host_app: str, cmd_options: CommandLineOptions):
        logger.info("Checking if Moonlight flatpak is installed or custom binary exists")
        if not await proxy.is_moonlight_installed():
            raise RunnerError(Result.MoonlightIsNotInstalled)

        logger.info("Terminating all Moonlight instances if any")
        await proxy.terminate_all_instances()

        logger.info("Starting Moonlight")
        await proxy.start(hostname, host_app, cmd_options)

    @staticmethod
    async def wait_for_stream_to_stop(client: BuddyClient, timeout: int):
        # This is a special case where user can decide not to wait for the stream end
        if timeout <= 0:
            return

        logger.info("Waiting for stream to stop")
        pooler = TimedPooler(timeout=timeout,
                             exception_on_timeout=RunnerError(Result.StreamDidNotEnd))

        async with pooler(await client.notify_on_changes(StreamStateResponse)) as notifications:
            async for n1, in notifications:
                state = n1["state"]

                if state == StreamState.NotStreaming:
                    break

    @classmethod
    async def end_successful_stream(cls, client: BuddyClient, close_steam: Optional[CloseSteam], timeout: int):
        logger.info("App closed gracefully, ending stream if it's still open")
        await client.end_stream()

        if close_steam == CloseSteam.Client:
            logger.info("Asking to close Steam if it's still open")
            await client.close_steam()
        elif close_steam == CloseSteam.BigPictureMode:
            logger.info("Asking to close Steam's BPM if it's still open")
            await client.close_steam_big_picture_mode()
            
        await cls.wait_for_stream_to_stop(client=client,
                                          timeout=timeout)

    @classmethod
    async def run(cls, settings: MoonDeckAppRunnerSettings, overlay_stack: OverlayStack):
        # Lazy import to improve CLI performance
        import asyncio
        import contextlib

        buddy_client = BuddyClient(
            settings["address"],
            settings["buddy_port"],
            settings["client_id"],
            settings["timeouts"]["buddyRequests"])
        moonlight_proxy = MoonlightProxy(
            settings["moonlight_exec_path"])

        async with buddy_client as client, moonlight_proxy as proxy:
            await cls.check_connectivity(client=client,
                                         overlay_stack=overlay_stack,
                                         mac=settings["mac"],
                                         host_id=settings["host_id"],
                                         hostname=settings["hostname"],
                                         host_port=settings["host_port"],
                                         wol_port=settings["wol_port"],
                                         custom_wol_exec=settings["custom_wol_exec_path"],
                                         wol_timeout=settings["timeouts"]["wakeOnLan"],
                                         server_timeout=settings["timeouts"]["servicePing"])
            await cls.wait_for_initial_conditions(client=client,
                                                  app_id=settings["app_id"],
                                                  user_id=settings["steam_user"] and settings["steam_user"]["id"],
                                                  timeout=settings["timeouts"]["initialConditions"])
            await cls.start_moonlight(proxy=proxy,
                                      hostname=settings["hostname"],
                                      host_app=settings["host_app"],
                                      cmd_options=settings["cmd_options"])

            proxy_task = asyncio.create_task(proxy.wait())
            launch_task = asyncio.create_task(MoonDeckAppLauncher.launch(client=client,
                                                                         big_picture_mode=settings["big_picture_mode"],
                                                                         app_id=settings["app_id"],
                                                                         user=settings["steam_user"],
                                                                         stream_rdy_timeout=settings["timeouts"]["streamReadiness"],
                                                                         steam_rdy_timeout=settings["timeouts"]["steamReadiness"],
                                                                         stability_timeout=settings["timeouts"]["appLaunchStability"],
                                                                         launch_timeout=settings["timeouts"]["appLaunch"],
                                                                         user_switch_timeout=settings["timeouts"]["userSwitch"],
                                                                         cleanup_on_error=True,
                                                                         manage_stream=True))
            all_tasks = {proxy_task, launch_task}

            cancel_msg = None
            try:
                await asyncio.wait(all_tasks, return_when=asyncio.FIRST_COMPLETED)
                if proxy_task.done():
                    await asyncio.wait({launch_task}, timeout=2)
                    if not launch_task.done():
                        raise RunnerError(Result.MoonlightClosed)
            except asyncio.CancelledError as err:
                # Forward the suspension args from the runner if any
                cancel_msg = err.args[0] if err.args else None
                raise err
            finally:
                for task in all_tasks:
                    if not task.done():
                        task.cancel(msg=cancel_msg)

                # We always await here even if we didn't cancel to check the results from try block
                for task in all_tasks:
                    with contextlib.suppress(asyncio.CancelledError):
                        await task

            await cls.end_successful_stream(client=client,
                                            close_steam=settings["close_steam"],
                                            timeout=settings["timeouts"]["streamEnd"])
