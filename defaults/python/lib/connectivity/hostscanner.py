# autopep8: off
def get_plugin_dir():
    from pathlib import Path
    return Path(__file__).parent.resolve()

def add_plugin_to_path():
    import sys

    plugin_dir = get_plugin_dir()
    directories = [["."], ["..", "..", "lib"], ["..", "..", "externals"]]
    for dir in directories:
        sys.path.insert(0, str(plugin_dir.joinpath(*dir)))

import sys
add_plugin_to_path()
print("sys.path: ", sys.path)


# autopep8: off
# def get_plugin_dir():
#     from pathlib import Path
#     return Path(__file__).parent.resolve()

# def add_plugin_to_path():
#     import sys

#     plugin_dir = get_plugin_dir()
#     directories = [["."], ["lib"], ["externals"], ["externals", "zeroconfig"]]
#     for dir in directories:
#         sys.path.insert(0, str(plugin_dir.joinpath(*dir)))

# import sys
# add_plugin_to_path()
# print("sys.path: ", sys.path)


import asyncio
# import html
# import re
# import externals.aiohttp as aiohttp
# import externals.zeroconf as zc
# import externals.async_timeout as async_timeout
# from . import utils

from zeroconf import IPVersion, ServiceStateChange, Zeroconf
from zeroconf.asyncio import AsyncServiceBrowser, AsyncServiceInfo, AsyncZeroconf


_PENDING_TASKS: set[asyncio.Task] = set()

# from zeroconf.asyncio import AsyncZeroconf, AsyncServiceBrowser
# from zeroconf._core import Zeroconf
# from zeroconf._services.info import AsyncServiceInfo
# from zeroconf._utils.net import IPVersion

# from .logger import logger


# async def scan_for_hosts(timeout: float = 5):
#     return await __find_hosts(predicate=None, timeout=timeout)


def async_on_service_state_change(
    zeroconf: Zeroconf, service_type: str, name: str, state_change: ServiceStateChange
) -> None:
    print(f"Service {name} of type {service_type} state changed: {state_change}")
    if state_change is not ServiceStateChange.Added:
        return
    task = asyncio.ensure_future(async_display_service_info(zeroconf, service_type, name))
    _PENDING_TASKS.add(task)
    task.add_done_callback(_PENDING_TASKS.discard)


async def async_display_service_info(zeroconf: Zeroconf, service_type: str, name: str) -> None:
    info = AsyncServiceInfo(service_type, name)
    await info.async_request(zeroconf, 3000)
    print(f"Info from zeroconf.get_service_info: {info!r}")
    if info:
        addresses = [f"{addr}:{int(info.port)}" for addr in info.parsed_scoped_addresses()]
        print(f"  Name: {name}")
        print(f"  Addresses: {', '.join(addresses)}")
        print(f"  Weight: {info.weight}, priority: {info.priority}")
        print(f"  Server: {info.server}")
        if info.properties:
            print("  Properties are:")
            for key, value in info.properties.items():
                print(f"    {key!r}: {value!r}")
        else:
            print("  No properties")
    else:
        print("  No info")
    print("\n")


async def main():
    async with AsyncZeroconf(ip_version=IPVersion.V4Only) as aiozeroconf:
        async with AsyncServiceBrowser(aiozeroconf.zeroconf,
                                       type_=["_nvstream._tcp.local."],
                                       handlers=[async_on_service_state_change]):
            await asyncio.sleep(5)

if __name__ == '__main__':
    asyncio.run(main())

