from . import outmsgs, inmsgs

from enum import Enum
from typing import Optional
from .buddyclient import BuddyClient


class RestartPcResult(Enum):
    Failed = "Failed to restart PC via Buddy!"


class ShutdownPcResult(Enum):
    Failed = "Failed to shutdown PC via Buddy!"


class CommandBuddyClient(BuddyClient):

    def get_login_type(self):
        return outmsgs.ControlType.PC

    async def restart_pc(self, timeout: Optional[float]):
        async def request():
            result = await self.login(timeout)
            if result:
                return result

            await self.write(outmsgs.RestartPcMsg())
            resp = await self.read(timeout)
            msg = inmsgs.convertFromJson(
                resp=resp, types=[inmsgs.MessageAccepted])
            if not msg:
                raise inmsgs.UnexpectedMessage(
                    resp, "at parsing restart PC response")

            return None

        return await self._try_request(request(), RestartPcResult.Failed)

    async def shutdown_pc(self, timeout: Optional[float]):
        async def request():
            result = await self.login(timeout)
            if result:
                return result

            await self.write(outmsgs.ShutdownPcMsg())
            resp = await self.read(timeout)
            msg = inmsgs.convertFromJson(
                resp=resp, types=[inmsgs.MessageAccepted])
            if not msg:
                raise inmsgs.UnexpectedMessage(
                    resp, "at parsing shutdown PC response")

            return None

        return await self._try_request(request(), ShutdownPcResult.Failed)
