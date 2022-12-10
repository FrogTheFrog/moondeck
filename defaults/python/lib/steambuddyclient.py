from . import outmsgs, inmsgs

from enum import Enum
from typing import Optional
from .buddyclient import BuddyClient


class LaunchAppResult(Enum):
    Failed = "Failed to launch app via Buddy!"


class GetSteamStatusResult(Enum):
    Failed = "Failed to get app status via Buddy!"


class ChangeResolutionResult(Enum):
    Failed = "Failed to change resolution via Buddy!"


class SteamBuddyClient(BuddyClient):

    def get_login_type(self):
        return outmsgs.ControlType.Steam

    async def launch_app(self, app_id: int, timeout: Optional[float]):
        async def request():
            result = await self.login(timeout)
            if result:
                return result

            await self.write(outmsgs.LaunchAppMsg(app_id))
            resp = await self.read(timeout)
            msg = inmsgs.convertFromJson(
                resp=resp, types=[inmsgs.MessageAccepted])
            if not msg:
                raise inmsgs.UnexpectedMessage(
                    resp, "at parsing launch app response")

            return None

        return await self._try_request(request(), LaunchAppResult.Failed)

    async def get_steam_status(self, timeout: Optional[float]):
        async def request():
            result = await self.login(timeout)
            if result:
                return result

            await self.write(outmsgs.SteamStatusMsg())
            resp = await self.read(timeout)
            msg: Optional[inmsgs.SteamStatus] = inmsgs.convertFromJson(
                resp=resp, types=[inmsgs.SteamStatus])
            if not msg:
                raise inmsgs.UnexpectedMessage(
                    resp, "at parsing steam status response")

            return msg

        return await self._try_request(request(), GetSteamStatusResult.Failed)

    async def change_resolution(self, width: int, height: int, immediate: bool, timeout: Optional[float]):
        async def request():
            result = await self.login(timeout)
            if result:
                return result

            await self.write(outmsgs.ChangeResolutionMsg(width, height, immediate))
            resp = await self.read(timeout)
            msg: Optional[inmsgs.SteamStatus] = inmsgs.convertFromJson(
                resp=resp, types=[inmsgs.MessageAccepted])
            if not msg:
                raise inmsgs.UnexpectedMessage(
                    resp, "at parsing change resolution response")

            return None

        return await self._try_request(request(), ChangeResolutionResult.Failed)
