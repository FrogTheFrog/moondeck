from typing import Optional
from .settingsparser import MoonlightOnlyRunnerSettings
from .wolsplashscreen import WolSplashScreen
from ..runnerresult import Result, RunnerError
from ..gamestreaminfo import get_server_info
from ..logger import logger
from ..moonlightproxy import MoonlightProxy, ResolutionDimensions


class MoonlightOnlyRunner:
    @staticmethod
    async def check_connectivity(address: str, mac: str, host_id: str, host_port: int, wol_timeout: int, server_timeout: int):
        logger.info("Checking connection to GameStream server")

        async with WolSplashScreen(address, mac, wol_timeout) as splash:
            while True:
                server_info = await get_server_info(address=address, 
                                                    port=host_port, 
                                                    timeout=server_timeout)
                server_status = server_info is not None and server_info["uniqueId"] == host_id
                
                if not splash.update(None, server_status):
                    if not server_status:
                        raise RunnerError(Result.GameStreamDead)
                    return

    @staticmethod
    async def start_moonlight(proxy: MoonlightProxy, hostname: str, host_app: str, audio: Optional[str], resolution: Optional[ResolutionDimensions]):
        logger.info("Checking if Moonlight flatpak is installed or custom binary exists")
        if not await proxy.is_moonlight_installed():
            raise RunnerError(Result.MoonlightIsNotInstalled)

        logger.info("Terminating all Moonlight instances if any")
        await proxy.terminate_all_instances()

        logger.info("Starting Moonlight")
        await proxy.start(hostname, host_app, audio, resolution)

    @classmethod
    async def run(cls, settings: MoonlightOnlyRunnerSettings):
        moonlight_proxy = MoonlightProxy(
            settings["moonlight_exec_path"])

        async with moonlight_proxy as proxy:
            await cls.check_connectivity(address=settings["address"], 
                                         mac=settings["mac"],
                                         host_id=settings["host_id"],
                                         host_port=settings["host_port"],
                                         wol_timeout=settings["timeouts"]["wakeOnLan"],
                                         server_timeout=settings["timeouts"]["servicePing"])
            await cls.start_moonlight(proxy=proxy,
                                      hostname=settings["hostname"],
                                      host_app=settings["host_app"],
                                      audio=settings["audio"] if settings["pass_to_moonlight"] else None,
                                      resolution=settings["resolution"] if settings["pass_to_moonlight"] else None)
            await proxy.wait()
