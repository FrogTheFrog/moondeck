import asyncio
import json
import ssl
import pathlib
from . import cobs

from typing import Any, Dict, Optional
from .logger import logger


class JsonClient:
    def __init__(self, address: str, port: int) -> None:
        self._address = address
        self._port = port
        self._reader: Optional[asyncio.StreamReader] = None
        self._writer: Optional[asyncio.StreamWriter] = None

    @property
    def address(self):
        return self._address

    @property
    def port(self):
        return self._port

    async def connect(self, timeout: Optional[float]) -> None:
        if not self._writer:
            try:
                cafile = str(pathlib.Path(
                    __file__).parent.resolve().joinpath("..", "ssl", "moondeck_cert.pem"))
                ssl_context = ssl.create_default_context(
                    ssl.Purpose.SERVER_AUTH, cafile=cafile)
                ssl_context.check_hostname = False

                self._reader, self._writer = await asyncio.wait_for(asyncio.open_connection(
                    self._address, 
                    self._port, 
                    ssl=ssl_context, 
                    ssl_handshake_timeout=timeout), timeout)
            except OSError as e:
                if e.errno == 113 or e.errno == 101:
                    logger.debug(
                        f"OSError {e.errno} (connection lost?) while executing request.")
                    raise ConnectionError from None
                else:
                    raise e

    async def disconnect(self) -> None:
        writer = self._writer
        self._reader = None
        self._writer = None

        if writer:
            writer._transport.abort()  # For SSL
            await writer.wait_closed()

    async def read(self, timeout: Optional[float]) -> Dict[Any, Any]:
        if not self._reader:
            raise ConnectionError("Connection was not initialized!")

        while True:
            try:
                data = await asyncio.wait_for(self._reader.readuntil(cobs.SEPARATOR), timeout)
                with memoryview(data) as data_view:
                    decoded_data = cobs.decode(data_view[:-1])

                if len(decoded_data) > 0:
                    return json.loads(decoded_data)

            except json.JSONDecodeError as error:
                logger.error("Error parsing JSON. {error}, from {data}".format(
                    error=error, data=decoded_data))
                pass
            except ConnectionError:
                await self.disconnect()
                raise
            except asyncio.IncompleteReadError:
                await self.disconnect()
                raise ConnectionError from None

    async def write(self, data: Any) -> None:
        if not self._writer:
            raise ConnectionError("Connection was not initialized!")

        try:
            if data:
                byte_data = json.dumps(
                    data, ensure_ascii=False, allow_nan=False).encode("utf-8")
                encoded_data = cobs.encode(byte_data)
                if not encoded_data:
                    raise ValueError(
                        "Failed to encode JSON byte buffer! Data before encoding: {data}".format(data=byte_data))

                self._writer.write(encoded_data + cobs.SEPARATOR)
                await self._writer.drain()

        except ConnectionError:
            await self.disconnect()
            raise
