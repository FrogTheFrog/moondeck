import aiohttp
import asyncio
import html
import re

from typing import TypedDict
from zeroconf import IPVersion, Zeroconf, ServiceListener
from zeroconf.asyncio import AsyncServiceBrowser, AsyncServiceInfo, AsyncZeroconf

from .logger import logger


class GameStreamHost(TypedDict):
    address: str
    port: int
    hostName: str
    uniqueId: str


class GameStreamListener(ServiceListener):
    def __init__(self, timeout: float, unique_id: str | None = None):
        self.timeout = timeout
        self.unique_id = unique_id
        self.__hosts: list[GameStreamHost] = []
        self.__tasks: set[asyncio.Task] = set()
        self.__cancel_condition = asyncio.Condition()

    def add_service(self, zc: Zeroconf, type_: str, name: str):
        task = asyncio.create_task(self.parse_info(zc, AsyncServiceInfo(type_, name)))
        self.__tasks.add(task)
        task.add_done_callback(self.__tasks.discard)

    def remove_service(self, zc: Zeroconf, type_: str, name: str):
        pass

    def update_service(self, zc: Zeroconf, type_: str, name: str):
        pass

    async def parse_info(self, zc: Zeroconf, info: AsyncServiceInfo):
        if not await info.async_request(zc, self.timeout * 1000):
            return

        if info.port is None:
            return

        for ip in info.parsed_scoped_addresses(version=IPVersion.V4Only):
            server_info = await get_server_info(ip, info.port, self.timeout)
            if server_info:
                if self.unique_id is None:
                    self.__hosts.append(server_info)
                elif self.unique_id == server_info["uniqueId"] and len(self.__hosts) == 0:
                    self.__hosts.append(server_info)
                    async with self.__cancel_condition:
                        self.__cancel_condition.notify_all()

    async def wait(self):
        async with self.__cancel_condition:
            try:
                await asyncio.wait_for(self.__cancel_condition.wait(), timeout=self.timeout)
            except asyncio.TimeoutError:
                pass

        return self.__hosts

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args, **kwargs):
        for task in list(self.__tasks):
            task.cancel()

        for task in list(self.__tasks):
            try:
                await task
            except asyncio.CancelledError:
                pass


async def _scan_for_hosts(timeout: float, unique_id: str | None = None):
    timeout = 0.1 if timeout <= 0 else timeout
    async with GameStreamListener(timeout, unique_id=unique_id) as listener:
        async with AsyncZeroconf(ip_version=IPVersion.V4Only) as aiozeroconf:
            async with AsyncServiceBrowser(aiozeroconf.zeroconf,
                                           type_=["_nvstream._tcp.local."],
                                           handlers=listener):
                return await listener.wait()


async def get_server_info(address: str, port: int, timeout: float):
    try:
        timeout = 0.1 if timeout <= 0 else timeout

        def get_host_id(data: str):
            if data:
                result = re.search("<uniqueid>(.*?)</uniqueid>", data)
                return html.unescape(str(result.group(1))) if result else None

        def get_host_name(data: str):
            if data:
                result = re.search("<hostname>(.*?)</hostname>", data)
                return html.unescape(str(result.group(1))) if result else None

        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=timeout)) as session:
            async with session.get(f"http://{address}:{port}/serverinfo") as resp:
                data = await resp.text(encoding="utf-8")
                hostname = get_host_name(data)
                unique_id = get_host_id(data)

                if hostname is None or unique_id is None:
                    return None

                return GameStreamHost({
                    "address": address,
                    "port": port,
                    "hostName": hostname,
                    "uniqueId": unique_id
                })

    except asyncio.TimeoutError:
        logger.debug("Timeout")
        return None

    except aiohttp.ClientError as e:
        logger.debug(f"Error while executing get_server_info request: {e}")
        return None


async def scan_for_hosts(timeout: float):
    return await _scan_for_hosts(timeout=timeout)


async def find_host(host_id: str, timeout: float):
    hosts = await _scan_for_hosts(timeout=timeout, unique_id=host_id)
    return hosts[0] if hosts else None
