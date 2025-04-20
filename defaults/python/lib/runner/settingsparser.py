from typing import Optional, TypedDict

from .envparser import EnvSettings, parse_env_settings, RunnerType
from ..runnerresult import RunnerError, Result
from ..settings import Dimension, HostSettings, RunnerTimeouts, settings_manager
from ..moonlightproxy import ResolutionDimensions
from ..logger import logger


class MoonDeckAppRunnerSettings(TypedDict):
    audio: Optional[str]
    resolution: ResolutionDimensions
    host_app: str
    hostname: str
    mac: str
    address: str
    host_port:int
    buddy_port: int
    client_id: str
    big_picture_mode: bool
    close_steam: bool
    timeouts: RunnerTimeouts
    moonlight_exec_path: Optional[str]
    app_id: str
    debug_logs: bool
    runner_type: RunnerType.MoonDeck


class MoonlightOnlyRunnerSettings(TypedDict):
    audio: Optional[str]
    resolution: ResolutionDimensions
    host_app: str
    hostname: str
    mac: str
    address: str
    timeouts: RunnerTimeouts
    moonlight_exec_path: Optional[str]
    app_id: str
    debug_logs: bool
    runner_type: RunnerType.MoonlightOnly


def parse_audio_settings(host_settings: HostSettings, env_settings: EnvSettings) -> Optional[str]:
    audio_option = host_settings["audio"]["defaultOption"]

    if host_settings["audio"]["useLinkedAudio"]:
        linked_audio_device = env_settings["linked_audio"]
        if linked_audio_device:
            for option, devices in host_settings["audio"]["linkedAudio"].items():
                if linked_audio_device in devices:
                    logger.info(f"Using linked audio device \"{linked_audio_device}\".")
                    audio_option = option

    logger.info(f"Parsed audio option: {audio_option}")
    return audio_option

def parse_resolution_settings(host_settings: HostSettings, env_settings: EnvSettings) -> ResolutionDimensions:
    dimensions: ResolutionDimensions = { 
        "size": None,
        "bitrate": host_settings["resolution"]["defaultBitrate"],
        "fps": host_settings["resolution"]["defaultFps"],
        "hdr": host_settings["resolution"]["defaultHdr"]
    }
    dimension_list = host_settings["resolution"]["dimensions"]

    def update_dimensions(dimension: Dimension):
        dimensions["size"] = { "width": dimension["width"], "height": dimension["height"] }
        if dimension["bitrate"] is not None:
            dimensions["bitrate"] = dimension["bitrate"]
        if dimension["fps"] is not None:
            dimensions["fps"] = dimension["fps"]
        if dimension["hdr"] is not None:
            dimensions["hdr"] = dimension["hdr"]

    if host_settings["resolution"]["useLinkedDisplays"] and len(dimension_list) > 0:
        linked_display = env_settings["linked_display"]
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
        auto_resolution = env_settings["auto_resolution"]
            
        logger.info(f"Using auto resolution from MoonDeck: {auto_resolution}")
        if auto_resolution:
            dimensions["size"] = { "width": auto_resolution["width"], "height": auto_resolution["height"] }
        else:
            logger.warning(f"Cannot use automatic resolution! MoonDeck did not pass resolution. Still continuing...")
 
    logger.info(f"Parsed resolution settings: {dimensions}")
    return dimensions

def parse_host_app_name(host_settings: HostSettings) -> str:
    host_app: str = "MoonDeckStream"
    app_list = host_settings["buddy"]["hostApp"]["apps"]
    if len(app_list) > 0:
        index = host_settings["buddy"]["hostApp"]["selectedAppIndex"]
        if index >= 0 and index < len(app_list):
            host_app = app_list[index]
        else:
            logger.warning(f"Host app index ({index}) out of range ([0;{len(app_list)}]). Still continuing...")
    
    logger.info(f"Parsed host app name: {host_app}")
    return host_app


async def parse_settings() -> MoonDeckAppRunnerSettings | MoonlightOnlyRunnerSettings:
    logger.info("Getting current host settings")
    user_settings = await settings_manager.get()
    host_settings = None

    host_id = user_settings["currentHostId"]
    if host_id is not None and host_id in user_settings["hostSettings"]:
        host_settings = user_settings["hostSettings"][host_id]

    if host_settings is None:
        raise RunnerError(Result.HostNotSelected)

    logger.info("Parsing ENV settings")
    env_settings = parse_env_settings()

    if env_settings["runner_type"] is None:
        raise RunnerError(Result.NoRunnerType)
    
    pass_to_moonlight = host_settings["passToMoonlight"]
    if not pass_to_moonlight:
        logger.info("Settings will NOT be passed to Moonlight")
    
    if env_settings["runner_type"] == RunnerType.MoonDeck:
        if env_settings["app_id"] is None:
            raise RunnerError(Result.NoAppId)

        return {
            "audio": parse_audio_settings(host_settings=host_settings, env_settings=env_settings),
            "resolution": parse_resolution_settings(host_settings=host_settings, env_settings=env_settings),
            "pass_to_moonlight": pass_to_moonlight,
            "host_app": parse_host_app_name(host_settings=host_settings),
            "hostname": host_settings["hostName"],
            "mac": host_settings["mac"],
            "address": host_settings["address"],
            "host_port": host_settings["hostInfoPort"],
            "buddy_port": host_settings["buddy"]["port"],
            "client_id": user_settings["clientId"],
            "big_picture_mode": host_settings["buddy"]["bigPictureMode"],
            "close_steam": host_settings["buddy"]["closeSteamOnceSessionEnds"],
            "timeouts": host_settings["runnerTimeouts"],
            "moonlight_exec_path": user_settings["moonlightExecPath"] if user_settings["useMoonlightExec"] else None,
            "app_id": env_settings["app_id"],
            "debug_logs": user_settings["runnerDebugLogs"],
            "runner_type": RunnerType.MoonDeck
        }
    else:
        if env_settings["app_name"] is None:
            raise RunnerError(Result.NoAppName)

        return {
            "audio": parse_audio_settings(host_settings=host_settings, env_settings=env_settings),
            "resolution": parse_resolution_settings(host_settings=host_settings, env_settings=env_settings),
            "pass_to_moonlight": pass_to_moonlight,
            "host_app": env_settings["app_name"],
            "hostname": host_settings["hostName"],
            "mac": host_settings["mac"],
            "address": host_settings["address"],
            "host_port": host_settings["hostInfoPort"],
            "timeouts": host_settings["runnerTimeouts"],
            "moonlight_exec_path": user_settings["moonlightExecPath"] if user_settings["useMoonlightExec"] else None,
            "debug_logs": user_settings["runnerDebugLogs"],
            "runner_type": RunnerType.MoonlightOnly
        }
