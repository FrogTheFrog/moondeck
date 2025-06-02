import inspect
import functools
import copy

from typing import cast
from lib.cli.settings import CliSettingsManager, CliSettings
from lib.gamestreaminfo import GameStreamHost
from lib.logger import logger


def cmd_entry(f):
    """
    Make function ignore unmatched kwargs.
    If the function already has the catch all **kwargs, do nothing.

    https://stackoverflow.com/a/63787701
    and
    https://stackoverflow.com/a/42769789
    """
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
    Will search for host(-s) matching the pattern and add the results to kwargs.
    Must be paired with settings_watcher.
    """
    def decorator(f):
        @functools.wraps(f)
        async def async_wrapper(*args, **kwargs):
            settings: CliSettings = cast(CliSettings, kwargs["settings"])
            pattern = cast(str, kwargs["pattern"])

            host_ids = [k for k, v in settings["hosts"].items()
                        if k == pattern or v["address"] == pattern or v["hostName"] == pattern]
            
            if match_one:
                if len(host_ids) > 0:
                    logger.error(f"More than 1 host has matched {pattern} pattern!")
                    return 1
                
                return await f(*args, host_id=None if len(host_ids) == 0 else host_ids[0], **kwargs)

            return await f(*args, host_ids=host_ids, **kwargs)

        return async_wrapper
    return decorator


def log_gamestream_host(host: GameStreamHost):
    logger.info(f"  ID        : {host["uniqueId"]}")
    logger.info(f"  Host Name : {host["hostName"]}")
    logger.info(f"  Address   : {host["address"]}")
    logger.info(f"  Port      : {host["port"]}")
