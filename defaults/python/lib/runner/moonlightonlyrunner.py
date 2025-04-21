from .settingsparser import MoonlightOnlyRunnerSettings
from .wolsplashscreen import WolSplashScreen
from ..runnerresult import Result, RunnerError
from ..hostinfo import get_server_info
from ..logger import logger
from ..settings import RunnerTimeouts
from ..moonlightproxy import MoonlightProxy


class MoonlightOnlyRunner:
    @staticmethod
    async def check_connectivity(address: str, mac: str, host_port: int, timeouts: RunnerTimeouts):
        logger.info("Checking connection to GameStream server")

        async with WolSplashScreen(address, mac, timeouts["wakeOnLan"]) as splash:
            while True:
                server_status = await get_server_info(address=address, 
                                                      port=host_port, 
                                                      timeout=timeouts["servicePing"]) is not None
                
                if not splash.update(None, server_status):
                    if not server_status:
                        raise RunnerError(Result.GameStreamDead)
                    return

    @staticmethod
    async def start_moonlight(proxy: MoonlightProxy):
        logger.info("Checking if Moonlight flatpak is installed or custom binary exists")
        if not await proxy.is_moonlight_installed():
            raise RunnerError(Result.MoonlightIsNotInstalled)

        logger.info("Terminating all Moonlight instances if any")
        await proxy.terminate_all_instances(kill_all=True)

        logger.info("Starting Moonlight")
        await proxy.start()

    @classmethod
    async def run(cls, settings: MoonlightOnlyRunnerSettings):
        moonlight_proxy = MoonlightProxy(
            settings["hostname"],
            settings["host_app"],
            settings["audio"] if settings["pass_to_moonlight"] else None,
            settings["resolution"] if settings["pass_to_moonlight"] else None,
            settings["moonlight_exec_path"])

        async with moonlight_proxy as proxy:
            await cls.check_connectivity(address=settings["address"], 
                                         mac=settings["mac"],
                                         host_port=settings["host_port"],
                                         timeouts=settings["timeouts"])
            await cls.start_moonlight(proxy=proxy)
            await proxy.wait()
