from enum import Enum
from typing import Any, Callable, Coroutine, List, Literal, Optional, Type, TypedDict, Union, TypeVar, get_args, get_origin, is_typeddict, cast

from .logger import logger
from .constants import RUNNER_READY_FILE


class AnyTypedDict(TypedDict, total=False):
    pass


T = TypeVar("T")
TD = TypeVar("TD", bound=AnyTypedDict)


def is_typed_dict(data_type):
    return is_typeddict(data_type)


def is_optional_like(data_type):
    args = get_args(data_type)
    return get_origin(data_type) == Union and len(args) == 2 and args[1] == type(None)


def is_dict_like(data_type):
    return is_typed_dict(data_type) or get_origin(data_type) == dict


def is_list_like(data_type):
    return get_origin(data_type) == list

    
def is_enum_like(data_type):
    # Lazy import to improve CLI performance
    import inspect

    return inspect.isclass(data_type) and issubclass(data_type, Enum)


def is_literal_like(data_type):
    return get_origin(data_type) == Literal


def from_list(item_type: Type[T], data: List[Any]) -> List[T]:
    assert isinstance(data, list), f"Expected list (\"{item_type}\"), got {data}"

    verified_data = []
    for item in data:
        if is_list_like(item_type):
            actual_type = get_args(item_type)
            verified_item = from_list(actual_type[0], item)
        elif is_dict_like(item_type):
            verified_item = from_dict(item_type, item)
        else:
            assert isinstance(item, item_type)
            verified_item = item
            
        verified_data.append(verified_item)
    return verified_data


def from_dict(output_type: Type[T], data: AnyTypedDict) -> T:
    # Lazy import to improve CLI performance
    import copy

    assert isinstance(data, dict), f"Expected dict (\"{output_type}\"), got {data}"
    
    def get_annotations(data_type, data):
        if is_typed_dict(data_type):
            for key, key_type in data_type.__annotations__.items():
                yield (key, key_type)
        else:
            for key in data.keys():
                yield (key, data_type[1])

    verified_data = {}
    for key, key_type in get_annotations(output_type, data):
        if key not in data:
            raise ValueError(f"Key \"{key}\" is not available in {data}.")

        if is_optional_like(key_type):
            if data[key] is None:
                verified_data[key] = None
                continue
            else:
                key_type = get_args(key_type)[0]

        actual_type = get_args(key_type) or key_type
        if is_enum_like(actual_type):
            verified_data[key] = actual_type[data[key]] # type: ignore
            continue
        elif is_dict_like(key_type):
            verified_data[key] = from_dict(actual_type, data[key]) # type: ignore
            continue
        elif is_list_like(key_type):
            verified_data[key] = from_list(actual_type[0], data[key]) # type: ignore
            continue
        elif is_literal_like(key_type):
            if data[key] not in actual_type:
                raise TypeError(f"Value {data[key]} of \"{key}\" does not match the valid literal value(s) {actual_type}")
        elif not isinstance(data[key], actual_type):
            raise TypeError(f"\"{key}\" value {data[key]} is not of valid type(s) {actual_type}")

        verified_data[key] = copy.deepcopy(data[key])

    return output_type(**verified_data) if is_typed_dict(output_type) else verified_data # type: ignore


# Decorator for loging the entry/exit and the result
def async_scope_log(log_fn):
    def decorator(func):
        # Lazy import to improve CLI performance
        from functools import wraps

        @wraps(func)
        async def impl(*args, **kwargs):
            args_str = "" if len(args) == 0 else f"args={args}"
            kwargs_str = "" if len(kwargs) == 0 else f"kwargs={kwargs}"
            sep_str = ", " if args_str and kwargs_str else ""
            
            log_fn(f"-> {func.__name__}({args_str}{sep_str}{kwargs_str})")
            result = await func(*args, **kwargs)
            log_fn(f"<- {func.__name__}(...): {result}")
            return result
        return impl
    return decorator


def ps_signal(process, kill: bool):
    import psutil

    def do_signal(proc_or_child):
        try:
            if kill:
                proc_or_child.kill()
            else:
                proc_or_child.terminate()
        except psutil.NoSuchProcess:
            pass
    
    proc = cast(psutil.Process, process)
    for child in list(proc.children(recursive=True)):
        do_signal(child)

    do_signal(proc)


async def wake_on_lan(hostname: str, address: str, mac: str, custom_exec: Optional[str] = None):
    if custom_exec:
        # Lazy import to improve CLI performance
        import asyncio
        import os
        import psutil
        import io

        newline = "\n"
        buffer = io.StringIO()
        wol_proc = None
        ps_proc = None
        try:
            env = os.environ.copy()
            env.pop("LD_LIBRARY_PATH", None)
            wol_proc = await asyncio.create_subprocess_exec(custom_exec, hostname, address, mac,
                                                            stdout=asyncio.subprocess.PIPE,
                                                            stderr=asyncio.subprocess.STDOUT,
                                                            env=env)
            ps_proc = psutil.Process(wol_proc.pid)

            async def handle_stream(stream: Optional[asyncio.StreamReader]):
                if not stream:
                    raise Exception("NULL WOL exec stream handle!")
                    return

                while not stream.at_eof():
                    data = await stream.readline()
                    buffer.write(data.decode())

            process_task = asyncio.create_task(wol_proc.wait())
            log_task = asyncio.create_task(handle_stream(wol_proc.stdout))
            await asyncio.wait([process_task, log_task], return_when=asyncio.ALL_COMPLETED)

            logger.info(f"WOL exec ({custom_exec}) output:{newline}{buffer.getvalue().strip(newline)}")
            if wol_proc.returncode:
                raise Exception(f"Custom WOL failed with code {wol_proc.returncode}")
        except asyncio.CancelledError:
            if ps_proc:
                assert wol_proc is not None
                ps_signal(ps_proc, kill=True)
                await wol_proc.wait()
                logger.info(f"WOL exec ({custom_exec}) output before it was killed:{newline}{buffer.getvalue().strip(newline)}")
    else:
        # Lazy import to improve CLI performance
        import socket
        import ipaddress
        from wakeonlan import send_magic_packet

        default_port = 9

        def _try_parse_info(ip_address: str):
            try:
                parsed_address = ipaddress.ip_address(ip_address)
                if isinstance(parsed_address, ipaddress.IPv4Address):
                    return socket.AF_INET, ip_address
                if isinstance(parsed_address, ipaddress.IPv6Address):
                    return socket.AF_INET6, ip_address
            except ValueError:
                pass

            return None

        # if valid IP was specified, we don't need to call `getaddrinfo` at all
        info = _try_parse_info(address)
        if info:
            infos = [info]
        else:
            infos = [(x[0], x[4][0]) for x in socket.getaddrinfo(address, default_port, family=socket.AF_UNSPEC)
                    if x[0] in [socket.AF_INET, socket.AF_INET6] and isinstance(x[4][0], str)]

        if not infos:
            raise Exception(f"WOL failed - {address} does not have any IPv4 or IPv6 interfaces!") 
        
        tried_addresses = []
        def try_send_magic_packet(ip_address, family):
            try:
                if (ip_address, family) in tried_addresses:
                    return

                tried_addresses.append((ip_address, family))
                address_log = address if address == ip_address else f"{address} ({ip_address})"
                logger.info(f"Sending WOL ({hostname} - {mac}) to {address_log}")

                send_magic_packet(mac, address_info, family, port=default_port)
            except OSError as err:
                acceptable_errors = [101]
                if err.errno in acceptable_errors:
                    logger.warning(f"WOL failed: {str(err)}")
                else:
                    raise

        for family, address_info in infos:
            if family == socket.AF_INET:
                # Broadcast for IPv4
                try_send_magic_packet("255.255.255.255", family)

            try_send_magic_packet(address_info, family)


def is_moondeck_runner_ready():
    # Lazy import to improve CLI performance
    import pathlib

    return pathlib.Path(RUNNER_READY_FILE).exists()


def change_moondeck_runner_ready_state(make_ready):
    # Lazy import to improve CLI performance
    import pathlib

    path = pathlib.Path(RUNNER_READY_FILE)
    if make_ready:
        path.touch(exist_ok=True)
    else:
        path.unlink(missing_ok=True)


class TimedPooler:
    def __init__(self, retries: int, exception_on_retry_out: Exception | None = None, delay: float = 1) -> None:
        self.delay = delay
        self.retries = retries
        self.exception_on_retry_out = exception_on_retry_out
        self._first_run = False

    def __call__(self, *requests: Callable[[], Coroutine[Any, Any, Any]]):
        return TimedPoolerGenerator(self, *requests)


class TimedPoolerGenerator:
    def __init__(self, pooler: TimedPooler, *requests: Callable[[], Coroutine[Any, Any, Any]]) -> None:
        assert len(requests) > 0
        self.pooler = pooler
        self.requests = requests

    def __aiter__(self):
        return self

    async def __anext__(self):
        # Lazy import to improve CLI performance
        import asyncio

        if self.pooler.retries <= 0:
            if self.pooler.exception_on_retry_out is not None:
                raise self.pooler.exception_on_retry_out
            raise StopAsyncIteration

        if not self.pooler._first_run:
            await asyncio.sleep(self.pooler.delay)

        self.pooler.retries -= 1
        self.pooler._first_run = False

        tasks = [asyncio.create_task(req()) for req in self.requests]
        try:
            responses = await asyncio.gather(*tasks)
        except Exception as err:
            for task in tasks:
                task.cancel()

            raise err

        return responses
