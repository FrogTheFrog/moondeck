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
from lib.buddyclient import BuddyClient, ChangeResolutionResult
from lib.logger import logger, set_log_filename
from lib.settings import settings_manager

import os
import asyncio
import lib.constants as constants
import lib.hostinfo as hostinfo
import lib.runnerresult as runnerresult
import externals.screeninfo as screeninfo
# autopep8: on

set_log_filename(constants.RUNNER_LOG_FILE)


class SpecialHandling(Enum):
    AppFinishedUpdating = "App is forever updating..."


class ResolutionChange(TypedDict):
    dimensions: ResolutionDimensions
    passToMoonlight: bool


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
        await asyncio.sleep(1)
        return False
    else:
        return error


async def wait_for_app_to_close(client: BuddyClient, app_id: int):
    async def wait_till_close(info: HostInfoResponse):
        if info["steamRunningAppId"] != app_id or not info["steamIsRunning"]:
            return True

        await asyncio.sleep(1)

    return await pool_host_info(client, wait_till_close)


async def wait_for_app_launch(client: BuddyClient, app_id: int):
    obj = {"retries": 30, "was_updating": False}

    async def wait_till_launch(info: HostInfoResponse):
        if info["steamIsRunning"]:
            if info["steamRunningAppId"] == app_id:
                return True
            if info["steamTrackedUpdatingAppId"] == app_id:
                obj["was_updating"] = True
                await asyncio.sleep(1)
                return False
            if obj["was_updating"]:
                return SpecialHandling.AppFinishedUpdating

        return await sleep_while_counting_down(obj, runnerresult.Result.AppLaunchFailed)

    return await pool_host_info(client, wait_till_launch)


async def wait_for_steam_to_be_ready(client: BuddyClient):
    obj = {"retries": 30}

    async def wait_till_stream_is_ready(info: HostInfoResponse):
        if info["streamState"] == StreamState.Streaming:
            return True

        return await sleep_while_counting_down(obj, runnerresult.Result.StreamFailedToStart)

    return await pool_host_info(client, wait_till_stream_is_ready)
    

async def launch_app_and_wait(res_change: Optional[ResolutionChange], client: BuddyClient, close_steam: bool, app_id: int):
    logger.info("Waiting for Steam to be ready to launch games")
    result = await wait_for_steam_to_be_ready(client)
    if result:
        return result

    if res_change:
        logger.info("Notifying Buddy to change resolution")
        resp = await client.change_resolution(res_change["dimensions"]["width"], res_change["dimensions"]["height"])
        if resp:
            if resp == ChangeResolutionResult.BuddyRefused:
                logger.info("Buddy refused resolution change. Continuing...")
            else:
                return resp

    retries = 5
    result = SpecialHandling.AppFinishedUpdating
    while result == SpecialHandling.AppFinishedUpdating and retries:
        retries -= 1

        logger.info(f"Sending request to launch app {app_id}")
        result = await client.launch_app(app_id)
        if result:
            return result

        logger.info(f"Waiting for app {app_id} to be launched in Steam")
        result = await wait_for_app_launch(client, app_id)
        if result and result != SpecialHandling.AppFinishedUpdating:
            return result 

    if result:
        logger.info(f"Giving up waiting for {app_id} to finish updating cycles")
        return result    

    logger.info("Waiting for app or Steam to close")
    result = await wait_for_app_to_close(client, app_id)
    if result:
        return result

    if close_steam:
        logger.info("App closed gracefully, asking to close Steam if it's still open")
        result = await client.close_steam(None)
        if result:
            return result
    else:
        logger.info("App closed gracefully, ending stream if it's still open")
        result = await client.end_stream()
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


async def wait_for_initial_host_conditions(res_change: Optional[ResolutionChange], client: BuddyClient, app_id: int):
    obj = {"retries": 30}

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

    return None


async def establish_connection(client: BuddyClient):
    logger.info("Establishing connection to Buddy")
    resp = await client.say_hello()
    if resp:
        return resp

    return None


async def establish_connection(client: BuddyClient):
    logger.info("Establishing connection to Buddy")
    resp = await client.say_hello()
    if resp:
        return resp

    logger.info("Checking if GameStream service is running")
    server_info = await hostinfo.get_server_info(client.address, timeout=constants.DEFAULT_TIMEOUT)
    if not server_info:
        return runnerresult.Result.GameStreamDead

    return None


async def run_game(res_change: Optional[ResolutionChange], hostname: str, address: str, port: int, client_id: Optional[str], close_steam: bool, app_id: int):
    try:
        async with BuddyClient(address, port, client_id, constants.DEFAULT_TIMEOUT) as client, \
                   MoonlightProxy(hostname, res_change["dimensions"] if (res_change and res_change["passToMoonlight"]) else None) as proxy:
            result = await establish_connection(client=client)
            if result:
                return result

            result = await wait_for_initial_host_conditions(res_change=res_change, client=client, app_id=app_id)
            if result:
                return result

            result = await start_moonlight(proxy=proxy)
            if result:
                return result

            proxy_task = asyncio.create_task(proxy.wait())
            launch_task = asyncio.create_task(launch_app_and_wait(res_change=res_change, client=client, close_steam=close_steam, app_id=app_id))

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

    except Exception:
        logger.exception("Unhandled exception")
        return runnerresult.Result.Exception


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

        res_dimensions: Optional[ResolutionDimensions] = None
        dimension_list = host_settings["resolution"]["dimensions"]
        if host_settings["resolution"]["useCustomDimensions"] and len(dimension_list) > 0:
            index = host_settings["resolution"]["selectedDimensionIndex"]
            if index >= 0 and index < len(dimension_list):
                res_dimensions = dimension_list[index]
            else:
                logger.warn(f"Dimension index ({index}) out of range ([0;{len(dimension_list)}]). Still continuing...")

        if not res_dimensions and host_settings["resolution"]["automatic"]:
            monitors = screeninfo.get_monitors()
            primary_monitor = next((monitor for monitor in monitors if monitor.is_primary), None)
            logger.info(f"Monitors: {monitors}")
            if primary_monitor:
                res_dimensions = { "width": primary_monitor.width, "height": primary_monitor.height }
            elif len(monitors) == 1:
                res_dimensions = { "width": monitors[0].width, "height": monitors[0].height }
            else:
                logger.warn(f"Cannot use automatic resolution. Have {len(monitors)} monitors. Still continuing...")
        
        res_change: Optional[ResolutionChange] = None
        if res_dimensions:
            logger.info(f"Will try to apply {res_dimensions['width']}x{res_dimensions['height']} resolution on host.")
            res_change = { 
                "dimensions": res_dimensions,
                "passToMoonlight": host_settings["resolution"]["passToMoonlight"]
            }

        logger.info("Trying to run the game")
        result = await run_game(res_change,
                                host_settings["hostName"],
                                host_settings["address"],
                                host_settings["buddyPort"],
                                user_settings["clientId"],
                                host_settings["closeSteamOnceSessionEnds"],
                                app_id)
        runnerresult.set_result(result)

    except Exception:
        logger.exception("Unhandled exception")
        runnerresult.set_result(runnerresult.Result.Exception)


if __name__ == "__main__":
    asyncio.run(main())
