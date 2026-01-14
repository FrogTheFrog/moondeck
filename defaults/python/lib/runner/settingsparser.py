from typing import Literal, Optional, TypedDict, cast
from enum import Enum

from .envparser import EnvSettings, parse_env_settings, RunnerType
from ..runnerresult import RunnerError, Result
from ..plugin.settings import Dimension, HostSettings, RunnerTimeouts, UserSettingsManager
from ..moonlightproxy import ResolutionDimensions, CommandLineOptions
from ..logger import logger
from .. import constants


class CloseSteam(Enum):
    Client = 0
    BigPictureMode = 1


class MoonDeckAppRunnerSettings(TypedDict):
    cmd_options: CommandLineOptions
    host_app: str
    host_id: str
    hostname: str
    mac: str
    address: str
    host_port: int
    buddy_port: int
    client_id: str
    big_picture_mode: bool
    close_steam: Optional[CloseSteam]
    timeouts: RunnerTimeouts
    moonlight_exec_path: Optional[str]
    custom_wol_exec_path: Optional[str]
    app_id: str
    debug_logs: bool
    runner_type: Literal[RunnerType.MoonDeck]


class MoonlightOnlyRunnerSettings(TypedDict):
    cmd_options: CommandLineOptions
    host_app: str
    host_id: str
    hostname: str
    mac: str
    address: str
    host_port: int
    timeouts: RunnerTimeouts
    moonlight_exec_path: Optional[str]
    custom_wol_exec_path: Optional[str]
    debug_logs: bool
    runner_type: Literal[RunnerType.MoonlightOnly]


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
        "hdr": host_settings["resolution"]["defaultHdr"],
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

def parse_cmd_options(pass_to_moonlight: bool, host_settings: HostSettings, env_settings: EnvSettings) -> CommandLineOptions:
    return CommandLineOptions({
        "audio": parse_audio_settings(host_settings=host_settings, env_settings=env_settings) if pass_to_moonlight else None,
        "resolution": parse_resolution_settings(host_settings=host_settings, env_settings=env_settings) if pass_to_moonlight else None,
        "show_performance_stats": host_settings["showPerformanceStats"] if pass_to_moonlight else None,
        "enable_v_sync": host_settings["enableVSync"] if pass_to_moonlight else None,
        "enable_frame_pacing": host_settings["enableFramePacing"] if pass_to_moonlight else None,
        "video_codec": host_settings["videoCodec"] if pass_to_moonlight else None,

        # This one is a special case since it is currently hardcoded based on the runner type and is not configurable.
        # The hardcoded non-None value should always be passed regardless of what `pass_to_moonlight` says.
        "quit_after": False if env_settings["runner_type"] == RunnerType.MoonDeck else None
    })

async def parse_settings() -> MoonDeckAppRunnerSettings | MoonlightOnlyRunnerSettings:
    logger.info("Getting current host settings")
    settings_manager = UserSettingsManager(constants.get_config_file_path())
    user_settings, _ = await settings_manager.read()
    host_settings = None

    if user_settings is None:
        raise RunnerError(Result.NoSettings)

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

        return MoonDeckAppRunnerSettings({
            "cmd_options": parse_cmd_options(pass_to_moonlight, host_settings=host_settings, env_settings=env_settings),
            "host_app": parse_host_app_name(host_settings=host_settings),
            "host_id": cast(str, host_id),
            "hostname": host_settings["hostName"],
            "mac": host_settings["mac"],
            "address": host_settings["address"],
            "host_port": host_settings["hostInfoPort"],
            "buddy_port": host_settings["buddy"]["port"],
            "client_id": user_settings["clientId"],
            "big_picture_mode": host_settings["buddy"]["bigPictureMode"],
            "close_steam": CloseSteam[host_settings["buddy"]["closeSteam"]] if host_settings["buddy"]["closeSteam"] else None,
            "timeouts": host_settings["runnerTimeouts"],
            "moonlight_exec_path": user_settings["moonlightExecPath"] if user_settings["useMoonlightExec"] else None,
            "custom_wol_exec_path": host_settings["customWolExecPath"] if host_settings["useCustomWolExec"] else None,
            "app_id": env_settings["app_id"],
            "debug_logs": user_settings["runnerDebugLogs"],
            "runner_type": RunnerType.MoonDeck
        })
    else:
        if env_settings["app_name"] is None:
            raise RunnerError(Result.NoAppName)

        return MoonlightOnlyRunnerSettings({
            "cmd_options": parse_cmd_options(pass_to_moonlight, host_settings=host_settings, env_settings=env_settings),
            "host_app": env_settings["app_name"],
            "host_id": cast(str, host_id),
            "hostname": host_settings["hostName"],
            "mac": host_settings["mac"],
            "address": host_settings["address"],
            "host_port": host_settings["hostInfoPort"],
            "timeouts": host_settings["runnerTimeouts"],
            "moonlight_exec_path": user_settings["moonlightExecPath"] if user_settings["useMoonlightExec"] else None,
            "custom_wol_exec_path": host_settings["customWolExecPath"] if host_settings["useCustomWolExec"] else None,
            "debug_logs": user_settings["runnerDebugLogs"],
            "runner_type": RunnerType.MoonlightOnly
        })
