import asyncio
import re
import externals.aiohttp as aiohttp
import externals.zeroconf as zc
import externals.zeroconf.asyncio as aiozc
import externals.async_timeout as async_timeout
from . import utils

from typing import List, Optional, Callable, TypedDict
from .logger import logger


class GameStreamHost(TypedDict):
    address: str
    port: int
    hostName: str
    mac: str
    uniqueId: str


def __getHostIdFromXml(data: str):
    if data:
        result = re.search("<uniqueid>(.*?)</uniqueid>", data)
        return str(result.group(1)) if result else None


def __getHostNameFromXml(data: str):
    if data:
        result = re.search("<hostname>(.*?)</hostname>", data)
        return str(result.group(1)) if result else None


def __getMacFromXml(data: str):
    if data:
        result = re.search("<mac>(.*?)</mac>", data)
        return str(result.group(1)) if result else None


async def __getter_timeout(cancel_condition: asyncio.Condition, timeout: float):
    try:
        await asyncio.sleep(timeout)
        async with cancel_condition:
            cancel_condition.notify_all()
    except asyncio.CancelledError:
        pass
    except Exception as e:
        logger.exception(e)
        pass
    finally:
        return []


async def __get_service_info(zeroconf: zc.Zeroconf, service_type: str, name: str, cancel_condition: asyncio.Condition,
                             predicate: Optional[Callable[[GameStreamHost], bool]]):
    hosts: list[GameStreamHost] = []
    try:
        info = aiozc.AsyncServiceInfo(service_type, name)
        info_result = await info.async_request(zeroconf, 3000)
        if info_result and info.port is not None:
            for ip in info.parsed_scoped_addresses(version=zc.IPVersion.V4Only):
                server_info = await get_server_info(ip, info.port, None)
                if server_info:
                    if predicate:
                        if predicate(server_info):
                            hosts.append(server_info)
                            async with cancel_condition:
                                cancel_condition.notify_all()
                                break
                    else:
                        hosts.append(server_info)

    except asyncio.CancelledError:
        logger.debug("Cancelling GameStream host search!")
        pass

    except Exception as e:
        logger.exception(e)
        pass

    finally:
        return hosts


async def __find_hosts(predicate: Optional[Callable[[GameStreamHost], bool]], timeout: float):
    assert timeout >= 0
    obj = {"aiozc": None, "aiobrowser": None}

    async def cancel_browser():
        if obj["aiobrowser"]:
            await obj["aiobrowser"].async_cancel()
            obj["aiobrowser"] = None
        if obj["aiozc"]:
            await obj["aiozc"].async_close()
            obj["aiozc"] = None

    flat_results: List[GameStreamHost] = []
    try:
        async_tasks: List[asyncio.Task[List[GameStreamHost]]] = set()
        cancel_condition = asyncio.Condition()

        def state_change_handler(zeroconf, service_type, name, state_change: zc.ServiceStateChange):
            if state_change is not zc.ServiceStateChange.Added:
                return
            async_tasks.add(asyncio.ensure_future(__get_service_info(
                zeroconf, service_type, name, cancel_condition, predicate)))

        services = ["_nvstream._tcp.local."]
        obj["aiozc"] = aiozc.AsyncZeroconf(ip_version=zc.IPVersion.V4Only)
        obj["aiobrowser"] = aiozc.AsyncServiceBrowser(
            obj["aiozc"].zeroconf, services, handlers=[state_change_handler])
        async_tasks.add(asyncio.ensure_future(
            __getter_timeout(cancel_condition, timeout)))

        async with cancel_condition:
            await cancel_condition.wait()

        await cancel_browser()
        for task in async_tasks:
            task.cancel()

        results: List[List[GameStreamHost]] = await asyncio.gather(*async_tasks)
        flat_results = [
            result for subresults in results for result in subresults]

    except Exception:
        logger.exception("Unhandled exception")
        pass

    finally:
        await cancel_browser()
        return flat_results


async def get_server_info(address: str, port: int, timeout: Optional[float]):
    try:
        async with async_timeout.timeout(timeout):
            async with aiohttp.ClientSession() as session:
                async with session.get(f"http://{address}:{port}/serverinfo") as resp:
                    data = await resp.text(encoding="utf-8")
                    hostname = __getHostNameFromXml(data)
                    mac = __getMacFromXml(data)
                    unique_id = __getHostIdFromXml(data)

                    if all(v is not None for v in [hostname, mac, unique_id]):
                        return utils.from_dict(GameStreamHost, {
                            "address": address,
                            "port": port,
                            "hostName": hostname,
                            "mac": mac,
                            "uniqueId": unique_id})
    except (asyncio.TimeoutError, aiohttp.ClientError) as e:
        logger.debug(f"Timeout or client error while executing request: {e}")
        return None
    except Exception as e:
        logger.exception("Unhandled expection raised.")
        return None


async def scan_for_hosts(timeout: float = 5):
    return await __find_hosts(predicate=None, timeout=timeout)


async def find_host(host_id: str, timeout: float = 5):
    hosts = await __find_hosts(predicate=lambda host: host["uniqueId"] == host_id, timeout=timeout)
    return hosts[0] if hosts else None
