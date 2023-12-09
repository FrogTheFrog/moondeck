# autopep8: off
def get_plugin_dir():
    from pathlib import Path
    return Path(__file__).parent.resolve()

def add_plugin_to_path():
    import sys

    plugin_dir = get_plugin_dir()
    directories = [["./"], ["lib"], ["externals"]]
    for dir in directories:
        sys.path.append(str(plugin_dir.joinpath(*dir)))

add_plugin_to_path()

from enum import Enum
from typing import Optional, TypedDict
from lib.moonlightproxy import MoonlightProxy, ResolutionDimensions
from lib.buddyrequests import HostInfoResponse, StreamState
from lib.buddyclient import BuddyClient, ChangeResolutionResult, HelloResult
from lib.logger import logger, set_log_filename, enable_debug_level
from lib.settings import Dimension, HostSettings, settings_manager, RunnerTimeouts
from lib.wolsplashscreen import WolSplashScreen

import os
import asyncio
import lib.constants as constants
import lib.hostinfo as hostinfo
import lib.runnerresult as runnerresult
# autopep8: on

set_log_filename(constants.RUNNER_LOG_FILE, rotate=False)


class SpecialHandling(Enum):
    AppFinishedUpdating = "App is forever updating..."


class ResolutionChange(TypedDict):
    dimensions: ResolutionDimensions
    passToBuddy: bool
    passToMoonlight: bool


class MoonDeckResolution(TypedDict):
    width: int
    height: int


async def sleep_before_return_if_false(value):
    if value is False:
        await asyncio.sleep(1)
    return value


async def pool_host_info(client: BuddyClient, predicate):
    while True:
        info = await client.get_host_info()
        if not isinstance(info, dict):
            return info

        result = await predicate(info)
        if isinstance(result, bool) or result is None:
            if result:
                return None
        else:
            return result


async def sleep_while_counting_down(object_ref, error: runnerresult.Result):
    object_ref["retries"] -= 1
    if object_ref["retries"] > 0:
        return await sleep_before_return_if_false(False)
    else:
        return error


async def wait_for_app_to_close(client: BuddyClient, app_id: int):
    async def wait_till_close(info: HostInfoResponse):
        if info["steamRunningAppId"] != app_id or not info["steamIsRunning"]:
            return True

        await asyncio.sleep(1)

    return await pool_host_info(client, wait_till_close)


async def wait_for_stream_to_stop(client: BuddyClient, timeouts: RunnerTimeouts):
    obj = {"retries": timeouts["streamEnd"]}
    if obj["retries"] <= 0:
        return None

    async def wait_to_stop(info: HostInfoResponse):
        if info["streamState"] == StreamState.NotStreaming:
            return True

        return await sleep_while_counting_down(obj, runnerresult.Result.StreamDidNotEnd)

    return await pool_host_info(client, wait_to_stop)


async def wait_for_app_launch(client: BuddyClient, app_id: int, timeouts: RunnerTimeouts):
    obj = {"retries": timeouts["appLaunch"], "stability_counter": timeouts["appLaunchStability"], "was_updating": False}

    async def wait_till_launch(info: HostInfoResponse):
        if info["steamIsRunning"]:
            if info["steamRunningAppId"] == app_id:
                # Reset the retry counter to the initial value for even more stability...
                obj["retries"] = timeouts["appLaunch"]

                # Counter is needed for apps that come with brain-dead launcher (EALink for example)
                obj["stability_counter"] -= 1

                # Usual the Steam app state changes rapidly with launchers, so if it stays
                # consistent for like 15s, it should be good enough for us
                return await sleep_before_return_if_false(obj["stability_counter"] == 0)
            else:
                # See note above, we are want the app id to stay consistent for 10s
                obj["stability_counter"] = timeouts["appLaunchStability"]

                if info["steamTrackedUpdatingAppId"] == app_id:
                    obj["was_updating"] = True
                    return await sleep_before_return_if_false(False)
                elif obj["was_updating"]:
                    # If the app is no longer updating we need to re-launch it by
                    # returning this special value
                    return SpecialHandling.AppFinishedUpdating

        return await sleep_while_counting_down(obj, runnerresult.Result.AppLaunchFailed)

    return await pool_host_info(client, wait_till_launch)


async def wait_for_stream_to_be_ready(client: BuddyClient, timeouts: RunnerTimeouts):
    obj = {"retries": timeouts["streamReadiness"]}

    async def wait_till_stream_is_ready(info: HostInfoResponse):
        if info["streamState"] == StreamState.Streaming:
            return True

        return await sleep_while_counting_down(obj, runnerresult.Result.StreamFailedToStart)

    return await pool_host_info(client, wait_till_stream_is_ready)


async def end_the_stream(client: BuddyClient, close_steam: bool, timeouts: RunnerTimeouts):
    logger.info("App closed gracefully, ending stream if it's still open")
    result = await client.end_stream()
    if result:
        return result

    if close_steam:
        logger.info("Asking to close Steam if it's still open")
        result = await client.close_steam(None)
        if result:
            return result
        
    logger.info("Waiting for stream to stop")
    result = await wait_for_stream_to_stop(client, timeouts)
    if result:
        return result


async def launch_app_and_wait(client: BuddyClient, app_id: int, timeouts: RunnerTimeouts):
    logger.info("Waiting for Steam to be ready to launch games")
    result = await wait_for_stream_to_be_ready(client, timeouts)
    if result:
        return result

    retries = timeouts["appUpdate"]
    result = SpecialHandling.AppFinishedUpdating
    while result == SpecialHandling.AppFinishedUpdating and retries:
        retries -= 1

        logger.info(f"Sending request to launch app {app_id}")
        result = await client.launch_app(app_id)
        if result:
            return result

        logger.info(f"Waiting for app {app_id} to be launched in Steam")
        result = await wait_for_app_launch(client, app_id, timeouts)
        if result and result != SpecialHandling.AppFinishedUpdating:
            return result 

    if result:
        logger.info(f"Giving up waiting for {app_id} to finish updating cycles")
        return result    

    logger.info("Waiting for app or Steam to close")
    result = await wait_for_app_to_close(client, app_id)
    if result:
        return result


async def start_moonlight(proxy: MoonlightProxy):
    logger.info("Checking if Moonlight flatpak is installed")
    if not await proxy.is_moonlight_installed():
        return runnerresult.Result.MoonlightIsNotInstalled

    logger.info("Terminating all Moonlight instances if any")
    await proxy.terminate_all_instances()

    logger.info("Starting Moonlight")
    await proxy.start()


async def wait_for_initial_host_conditions(res_change: ResolutionChange, client: BuddyClient, app_id: int, timeouts: RunnerTimeouts):
    obj = {"retries": timeouts["initialConditions"]}

    async def wait_till_stream_to_be_ready(info: HostInfoResponse):
        if info["streamState"] == StreamState.StreamEnding:
            return await sleep_while_counting_down(obj, runnerresult.Result.StreamDidNotEnd)

        if info["streamState"] in [StreamState.Streaming, StreamState.NotStreaming]:
            if info["steamIsRunning"]:
                current_app_is_running = info["steamRunningAppId"] == app_id
                current_app_is_updating = info["steamTrackedUpdatingAppId"] == app_id

                if current_app_is_running or current_app_is_updating:
                    return True
                elif current_app_is_running == constants.NULL_STEAM_APP_ID:
                    return True

                return await sleep_while_counting_down(obj, runnerresult.Result.AnotherSteamAppIsRunning)

        return True

    logger.info("Waiting for a initial stream conditions to be satisfied")
    result = await pool_host_info(client, wait_till_stream_to_be_ready)
    if result:
        return result

    if res_change["dimensions"]["size"] and res_change["passToBuddy"]:
        logger.info("Notifying Buddy to change resolution")
        resp = await client.change_resolution(res_change["dimensions"]["size"]["width"], res_change["dimensions"]["size"]["height"])
        if resp:
            if resp == ChangeResolutionResult.BuddyRefused:
                logger.warn("Buddy refused resolution change. Continuing...")
            else:
                return resp

    return None


async def establish_connection(client: BuddyClient, mac: str, hostInfoPort: int, timeouts: RunnerTimeouts):
    logger.info("Checking connection to Buddy and GameStream server")

    async with WolSplashScreen(client.address, mac, timeouts["wakeOnLan"]) as splash:
        while True:
            buddy_result = await client.say_hello(force=True)
            if buddy_result:
                if buddy_result != HelloResult.Offline:
                    return buddy_result
            
            buddy_status = buddy_result != HelloResult.Offline
            server_status = await hostinfo.get_server_info(client.address, 
                                                        hostInfoPort, 
                                                        timeout=timeouts["servicePing"]) is not None
            
            if not splash.update(buddy_status, server_status):
                if not buddy_status:
                    return HelloResult.Offline
                if not server_status:
                    return runnerresult.Result.GameStreamDead
                return None


async def run_game(res_change: ResolutionChange, host_app: str, hostname: str, mac: str, address: str, hostInfoPort:int, buddyPort: int, client_id: Optional[str], close_steam: bool, timeouts: RunnerTimeouts, app_id: int):
    try:
        async with BuddyClient(address, buddyPort, client_id, timeouts["buddyRequests"]) as client, \
                   MoonlightProxy(hostname, host_app, res_change["dimensions"] if res_change["passToMoonlight"] else None) as proxy:
            result = await establish_connection(client=client, mac=mac, hostInfoPort=hostInfoPort, timeouts=timeouts)
            if result:
                return result

            result = await wait_for_initial_host_conditions(res_change=res_change, client=client, app_id=app_id, timeouts=timeouts)
            if result:
                return result

            result = await start_moonlight(proxy=proxy)
            if result:
                return result

            proxy_task = asyncio.create_task(proxy.wait())
            launch_task = asyncio.create_task(launch_app_and_wait(client=client, app_id=app_id, timeouts=timeouts))

            done, _ = await asyncio.wait({proxy_task, launch_task}, return_when=asyncio.FIRST_COMPLETED)
            if proxy_task in done:
                done, _ = await asyncio.wait({launch_task}, timeout=2)
                if launch_task in done:
                    result = launch_task.result()
                    if result:
                        return result
                else:
                    launch_task.cancel()
                    await asyncio.wait({launch_task}, timeout=2)
                    return runnerresult.Result.MoonlightClosed
            else:
                assert launch_task in done, "Launch task is not done?!"
                result = launch_task.result()
                if result:
                    return result
                
            result = await end_the_stream(client=client, close_steam=close_steam, timeouts=timeouts)
            if result:
                return result

    except Exception:
        logger.exception("Unhandled exception")
        return runnerresult.Result.Exception


def get_auto_resolution() -> Optional[MoonDeckResolution]:
    value = os.environ.get("MOONDECK_AUTO_RES")
    try:
        if value is None:
            return None
        
        value = str(value).split("x")
        return { "width": int(value[0]), "height": int(value[1]) }
    except:
        logger.exception("While getting auto resolution")
        return None
    

def get_linked_display() -> Optional[str]:
    value = os.environ.get("MOONDECK_LINKED_DISPLAY")
    try:
        if value is None:
            return None
        
        return str(value)
    except:
        logger.exception("While getting linked display")
        return None


def get_resolution_change(host_settings: HostSettings) -> ResolutionChange:
    dimensions: ResolutionDimensions = { 
        "size": None,
        "bitrate": host_settings["resolution"]["defaultBitrate"],
        "fps": host_settings["resolution"]["defaultFps"]
    }
    dimension_list = host_settings["resolution"]["dimensions"]

    def update_dimensions(dimension: Dimension):
        dimensions["size"] = { "width": dimension["width"], "height": dimension["height"] }
        if dimension["bitrate"] is not None:
            dimensions["bitrate"] = dimension["bitrate"]
        if dimension["fps"] is not None:
            dimensions["fps"] = dimension["fps"]

    if host_settings["resolution"]["useLinkedDisplays"] and len(dimension_list) > 0:
        linked_display = get_linked_display()
        if linked_display:
            for dimension in dimension_list:
                if linked_display in dimension["linkedDisplays"]:
                    logger.info(f"Using linked custom resolution for display \"{linked_display}\".")
                    update_dimensions(dimension)

    if not dimensions["size"] and host_settings["resolution"]["useCustomDimensions"] and len(dimension_list) > 0:
        index = host_settings["resolution"]["selectedDimensionIndex"]
        if index >= 0 and index < len(dimension_list):
            logger.info("Using custom resolution.")
            update_dimensions(dimension_list[index])
        else:
            logger.warn(f"Dimension index ({index}) out of range ([0;{len(dimension_list)}]). Still continuing...")
    
    if not dimensions["size"] and host_settings["resolution"]["automatic"]:
        auto_resolution = get_auto_resolution()
            
        logger.info(f"Using auto resolution from MoonDeck: {auto_resolution}")
        if auto_resolution:
            dimensions["size"] = { "width": auto_resolution["width"], "height": auto_resolution["height"] }
        else:
            logger.warn(f"Cannot use automatic resolution! MoonDeck did not pass resolution. Still continuing...")
        
    res_change: ResolutionChange = { 
        "dimensions": dimensions,
        "passToBuddy": host_settings["resolution"]["passToBuddy"],
        "passToMoonlight": host_settings["resolution"]["passToMoonlight"]
    }
    logger.info(f"Parsed resolution settings: {res_change}")
    return res_change


def get_app_id() -> Optional[int]:
    app_id = os.environ.get("MOONDECK_STEAM_APP_ID")
    try:
        return int(app_id) if app_id is not None else app_id
    except:
        logger.exception("While getting app id")
        return None


async def main():
    try:
        logger.info("Resetting runner result")
        runnerresult.set_result(
            runnerresult.Result.ClosedPrematurely, log_result=False)

        logger.info("Getting app id")
        app_id = get_app_id()
        if app_id is None:
            runnerresult.set_result(runnerresult.Result.NoAppId)
            return

        logger.info("Getting current host settings")
        user_settings = await settings_manager.get()
        host_settings = None

        host_id = user_settings["currentHostId"]
        if host_id is not None and host_id in user_settings["hostSettings"]:
            host_settings = user_settings["hostSettings"][host_id]

        if host_settings is None:
            runnerresult.set_result(runnerresult.Result.HostNotSelected)
            return
        
        if host_settings["runnerDebugLogs"]:
            enable_debug_level()

        res_change = get_resolution_change(host_settings=host_settings)
        host_app: str = "MoonDeckStream"
        app_list = host_settings["hostApp"]["apps"]
        if len(app_list) > 0:
            index = host_settings["hostApp"]["selectedAppIndex"]
            if index >= 0 and index < len(app_list):
                host_app = app_list[index]
            else:
                logger.warn(f"Host app index ({index}) out of range ([0;{len(app_list)}]). Still continuing...")

        logger.info(f"Trying to run the game using the app {host_app}")
        result = await run_game(res_change,
                                host_app,
                                host_settings["hostName"],
                                host_settings["mac"],
                                host_settings["address"],
                                host_settings["hostInfoPort"],
                                host_settings["buddyPort"],
                                user_settings["clientId"],
                                host_settings["closeSteamOnceSessionEnds"],
                                host_settings["runnerTimeouts"],
                                app_id)
        runnerresult.set_result(result)

    except Exception:
        logger.exception("Unhandled exception")
        runnerresult.set_result(runnerresult.Result.Exception)


if __name__ == "__main__":
    asyncio.run(main())
