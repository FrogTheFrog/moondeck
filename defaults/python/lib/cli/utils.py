from typing import cast
from lib.cli.settings import CliSettingsManager, CliSettings
from lib.gamestreaminfo import GameStreamHost, get_server_info
from lib.logger import logger
from lib.buddyclient import BuddyClient, BuddyException, HelloResult


def cmd_entry(f):
    """
    Make function ignore unmatched kwargs.
    If the function already has the catch all **kwargs, do nothing.

    https://stackoverflow.com/a/63787701
    and
    https://stackoverflow.com/a/42769789
    """
    # Lazy import to improve CLI performance
    import inspect

    def contains_var_kwarg(f):
        return any(
            param.kind == inspect.Parameter.VAR_KEYWORD
            for param in inspect.signature(f).parameters.values()
        )

    if contains_var_kwarg(f):
        return f

    def is_kwarg_of(key, f):
        param = inspect.signature(f).parameters.get(key, None)
        return param and (
            param.kind is inspect.Parameter.KEYWORD_ONLY or
            param.kind is inspect.Parameter.POSITIONAL_OR_KEYWORD
        )

    def filter_kwargs(**kwargs):
        return {
            key: value
            for key, value in kwargs.items()
            if is_kwarg_of(key, f)
        }

    # Lazy import to improve CLI performance
    import functools

    @functools.wraps(f)
    async def async_wrapper(*args, **kwargs):
        return await f(*args, **filter_kwargs(**kwargs))

    return async_wrapper


def settings_watcher(dry: bool | None = None):
    """
    Loads settings automatically (or returns default if none is available).
    If the settings are modified afterwards, the will be saved unless "dry" mode is enabled.
    """
    def decorator(f):
        # Lazy import to improve CLI performance
        import functools
        import copy
    
        @functools.wraps(f)
        async def async_wrapper(*args, **kwargs):
            do_write: bool = kwargs.get("dry", False) if dry is None else dry
            settings_manager = cast(CliSettingsManager, kwargs["settings_manager"])

            initial_settings, _ = await settings_manager.read()
            settings = copy.deepcopy(
                initial_settings or settings_manager._default_settings())

            result = await f(*args, settings=settings, **kwargs)

            if not do_write and initial_settings != settings:
                await settings_manager.write(settings)

            return result

        return async_wrapper

    return decorator


def host_pattern_matcher(match_one: bool):
    """
    Will search for host(s) matching the pattern and add the results to kwargs.
    Must be paired with settings_watcher.
    """
    def decorator(f):
        # Lazy import to improve CLI performance
        import functools

        @functools.wraps(f)
        async def async_wrapper(*args, **kwargs):
            settings: CliSettings = cast(CliSettings, kwargs["settings"])
            pattern = cast(str | None, kwargs["host"] or settings["defaultHost"])

            if pattern is None:
                logger.error("Default host has not been set!")
                return 1

            host_ids = [k for k, v in settings["hosts"].items()
                        if k == pattern or v["address"] == pattern or v["hostName"] == pattern]
            
            if match_one:
                if len(host_ids) > 1:
                    logger.error(f"More than 1 host has matched {pattern} pattern!")
                    return 1
                
                if len(host_ids) == 0:
                    logger.error(f"No host found that matches {pattern} pattern!")
                    return 1
                
                return await f(*args, host_id=host_ids[0], **kwargs)

            return await f(*args, host_ids=host_ids, **kwargs)

        return async_wrapper

    return decorator


def wol_settings(f):
    """
    Adds wol_address and wol_mac to the kwargs.
    Must be paired with host_pattern_matcher.
    """
    # Lazy import to improve CLI performance
    import functools

    @functools.wraps(f)
    async def async_wrapper(*args, **kwargs):
        settings: CliSettings = cast(CliSettings, kwargs["settings"])
        host_id: str = cast(str, kwargs["host_id"])

        hostname = settings["hosts"][host_id]["hostName"]
        address = settings["hosts"][host_id]["address"]
        mac = settings["hosts"][host_id]["mac"]
        if mac is None:
            logger.error("Host has not been paired yet or the MAC was not synced!")
            return 1

        return await f(*args, hostname=hostname, wol_address=address, wol_mac=mac, **kwargs)

    return async_wrapper


def buddy_session(auto_sync_mac: bool = True):
    """
    Create Buddy session and automatically sync some data.
    Must be paired with host_pattern_matcher.
    """
    def decorator(f):
        # Lazy import to improve CLI performance
        import functools

        @functools.wraps(f)
        async def async_wrapper(*args, **kwargs):
            settings: CliSettings = cast(CliSettings, kwargs["settings"])
            host_id = cast(str, kwargs["host_id"])
            buddy_timeout = cast(float, kwargs["buddy_timeout"])
            buddy_port: int | None = kwargs.get("buddy_port", settings["hosts"][host_id]["buddyPort"])

            if buddy_port is None:
                logger.error("Buddy port is not specified or not set in config!")
                return 1

            buddy_client = BuddyClient(
                address=settings["hosts"][host_id]["address"],
                port=buddy_port,
                client_id=settings["clientId"],
                timeout=buddy_timeout)

            async with buddy_client as client:
                result = await f(*args, buddy_client=client, **kwargs)

                if auto_sync_mac and client.hello_was_ok:
                    try:
                        resp = await client.get_host_info()
                        settings["hosts"][host_id]["mac"] = resp["mac"]
                    except Exception as err:
                        logger.debug(f"Exception while trying to update MAC from Buddy: {err}")                    

                return result

        return async_wrapper

    return decorator


async def check_connectivity(client: BuddyClient, info_port: int, host_id: str, server_timeout: float, timeout: float, inverse: bool = False):
    # Lazy import to improve CLI performance
    import asyncio

    loop = asyncio.get_running_loop()
    now = loop.time()
    timeout_at = now + (0 if timeout <= 0 else timeout)

    timeout_str_length = 0
    def timeout_str(time):
        timeout_in = timeout_at - time
        timeout_in = timeout_in if timeout_in > 0 else 0
        return f"{timeout_in:.2f}".rjust(timeout_str_length)
    
    timeout_str_length = len(timeout_str(time=now))

    tasks: list[asyncio.Task] = []
    status = {"buddy": False, "server": False}

    def print_status():
        def status_str(status):
            return " online" if status else "offline"
        
        logger.info(f"  Buddy: {status_str(status["buddy"])}, Server: {status_str(status["server"])}, Timeout in: {timeout_str(time=loop.time())} second(s)")

    try:
        logger.info(f"Checking connection to Buddy and GameStream server (timeout in: {timeout_str(time=now)}):")
        async with asyncio.timeout_at(timeout_at):
            while True:
                async def get_buddy_status():
                    try:
                        await client.say_hello(force=True)
                        status["buddy"] = True
                    except BuddyException as err:
                        valid_errors = [HelloResult.Offline, HelloResult.Restarting, HelloResult.ShuttingDown, HelloResult.Suspending]
                        if err.result in valid_errors:
                            status["buddy"] = False
                        else:
                            raise err
                
                async def get_server_status():
                    server_info = await get_server_info(address=client.address, 
                                                        port=info_port, 
                                                        timeout=server_timeout)
                    status["server"] = server_info is not None and server_info["uniqueId"] == host_id

                tasks = [asyncio.create_task(req()) for req in [get_buddy_status, get_server_status]]
                await asyncio.gather(*tasks)

                print_status()
                if (not status["buddy"] and not status["server"]) if inverse else (status["buddy"] and status["server"]):
                    return True
    
    except asyncio.TimeoutError:
        print_status()
        return False
    
    finally:
        for task in tasks:
            task.cancel()


def log_gamestream_host(host: GameStreamHost):
    logger.info(f"  ID        : {host["uniqueId"]}")
    logger.info(f"  Host Name : {host["hostName"]}")
    logger.info(f"  Address   : {host["address"]}")
    logger.info(f"  Port      : {host["port"]}")
