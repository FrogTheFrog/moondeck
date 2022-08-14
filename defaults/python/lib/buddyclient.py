from abc import abstractmethod
import asyncio
import ssl
from . import outmsgs, inmsgs

from enum import Enum
from typing import Optional
from .jsonclient import JsonClient
from .logger import logger


class HelloResult(Enum):
    SslVerificationFailed = "SSL certificate could not be verified!"
    Exception = "An exception was thrown, check the logs!"
    VersionMismatch = "MoonDeck/Buddy needs update!"
    Restarting = "Buddy is restarting the PC!"
    ShuttingDown = "Buddy is shutting down the PC!"
    Pairing = "MoonDeck/Buddy is pairing!"
    NotPaired = "MoonDeck/Buddy needs pairing!"
    NoClientId = "Client ID is missing!"
    Offline = "Buddy is offline!"


class LoginResult(Enum):
    ControlAlreadyTaken = "Other deck is connected to Buddy!"
    Failed = "Failed to login to Buddy!"


class PairingResult(Enum):
    AlreadyPaired = "Deck is already paired with Buddy!"
    Failed = "Failed to start pairing with Buddy!"


class AbortPairingResult(Enum):
    Failed = "Failed to abort pairing with Buddy!"


class CloseSteamResult(Enum):
    Failed = "Failed to close Steam via Buddy!"


class BuddyClient(JsonClient):

    def __init__(self, address: str, port: int, client_id: str) -> None:
        super().__init__(address, port)
        self._client_id = client_id
        self.__hello_was_ok = False
        self.__logged_in = False

    @abstractmethod
    def get_login_type(self) -> outmsgs.ControlType:
        raise NotImplemented

    @property
    def client_id(self):
        return self._client_id

    async def disconnect(self) -> None:
        await super().disconnect()
        self.__hello_was_ok = False
        self.__logged_in = False

    async def _try_request(self, request, fallback_value):
        try:
            return await request
        except (asyncio.TimeoutError, ConnectionError):
            logger.debug("Timeout or connection loss while executing request.")
            return fallback_value
        except ssl.SSLCertVerificationError:
            logger.exception("Request failed: SSL Verification.")
            return HelloResult.SslVerificationFailed
        except inmsgs.UnexpectedMessage as e:
            msg = inmsgs.convertFromJson(resp=e.resp)
            logger.error("Request failed {error}. Got {msg}.".format(
                error=e.message, msg=msg or e.resp))
            return fallback_value
        except Exception:
            logger.exception("Request failed: unknown expection raised.")
            return HelloResult.Exception

    async def login(self, timeout: Optional[float]):
        async def request():
            result = await self.say_hello(timeout)
            if result:
                return result

            assert self._client_id is not None, "Client ID is null!"
            await self.write(outmsgs.LoginMsg(self.get_login_type(), self._client_id))
            resp = await self.read(timeout)
            msg = inmsgs.convertFromJson(
                resp=resp, types=[inmsgs.MessageAccepted, inmsgs.ControlTypeTaken])
            if not msg:
                raise inmsgs.UnexpectedMessage("failed at steam login")

            return None if isinstance(msg, inmsgs.MessageAccepted) else LoginResult.ControlAlreadyTaken

        if self.__logged_in:
            return

        result = await self._try_request(request(), LoginResult.Failed)
        if not result:
            self.__logged_in = True

        return result

    async def say_hello(self, timeout: Optional[float]):
        async def request():
            await self.connect(timeout)

            await self.write(outmsgs.HelloMsg())
            resp = await self.read(timeout)
            msg = inmsgs.convertFromJson(
                resp=resp, types=[inmsgs.VersionMismatch, inmsgs.MessageAccepted])
            if not msg:
                raise inmsgs.UnexpectedMessage(
                    resp, "at parsing hello response")

            if isinstance(msg, inmsgs.VersionMismatch):
                return HelloResult.VersionMismatch

            if self._client_id is None:
                return HelloResult.NoClientId

            await self.write(outmsgs.PcStateMsg())
            resp = await self.read(timeout)
            msg = inmsgs.convertFromJson(
                resp=resp, types=[inmsgs.PcState])
            if not msg:
                raise inmsgs.UnexpectedMessage(
                    resp, "at parsing PC state response")

            assert isinstance(msg, inmsgs.PcState)
            if msg.pc_state == "Restarting":
                return HelloResult.Restarting
            elif msg.pc_state == "ShuttingDown":
                return HelloResult.ShuttingDown

            await self.write(outmsgs.PairStatus(self._client_id))
            resp = await self.read(timeout)
            msg = inmsgs.convertFromJson(
                resp=resp, types=[inmsgs.Paired, inmsgs.NotPaired, inmsgs.Pairing])
            if not msg:
                raise inmsgs.UnexpectedMessage(
                    resp, "at parsing pair status response")

            if isinstance(msg, inmsgs.NotPaired):
                return HelloResult.NotPaired
            elif isinstance(msg, inmsgs.Pairing):
                return HelloResult.Pairing

            return None

        if self.__hello_was_ok:
            return

        result = await self._try_request(request(), HelloResult.Offline)
        if not result:
            self.__hello_was_ok = True

        return result

    async def start_pairing(self, pin: int, timeout: Optional[float]):
        async def request():
            result = await self.say_hello(timeout)
            if not result:
                return PairingResult.AlreadyPaired
            elif result != HelloResult.NotPaired:
                return result

            assert self._client_id is not None, "Client ID is null!"
            await self.write(outmsgs.PairMsg(self._client_id, pin))
            resp = await self.read(timeout)
            msg = inmsgs.convertFromJson(
                resp=resp, types=[inmsgs.MessageAccepted, inmsgs.InvalidMessage, inmsgs.Paired])
            if not msg:
                raise inmsgs.UnexpectedMessage("failed at pairing start")

            if isinstance(msg, inmsgs.InvalidMessage):
                return PairingResult.Failed
            elif isinstance(msg, inmsgs.Paired):
                return PairingResult.AlreadyPaired

            return None

        return await self._try_request(request(), PairingResult.Failed)

    async def abort_pairing(self, timeout: Optional[float]):
        async def request():
            result = await self.say_hello(timeout)
            if not result:
                return None
            elif result != HelloResult.Pairing:
                return result

            assert self._client_id is not None, "Client ID is null!"
            await self.write(outmsgs.AbortPairingMsg(self._client_id))
            resp = await self.read(timeout)
            msg = inmsgs.convertFromJson(
                resp=resp, types=[inmsgs.MessageAccepted])
            if not msg:
                raise inmsgs.UnexpectedMessage("failed at aborting pairing")

            return None

        return await self._try_request(request(), AbortPairingResult.Failed)

    async def close_steam(self, timeout: Optional[float]):
        async def request():
            result = await self.login(timeout)
            if result:
                return result

            await self.write(outmsgs.CloseSteamMsg())
            resp = await self.read(timeout)
            msg = inmsgs.convertFromJson(
                resp=resp, types=[inmsgs.MessageAccepted])
            if not msg:
                raise inmsgs.UnexpectedMessage(
                    resp, "at parsing close steam response")

            return None

        return await self._try_request(request(), CloseSteamResult.Failed)
