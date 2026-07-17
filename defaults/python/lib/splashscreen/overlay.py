
class Overlay:
    def __init__(self, stack) -> None:
        self.__stack = stack

    async def __aenter__(self):
        self.__stack.push_overlay(self)
        return self

    async def __aexit__(self, exc_type, exc, tb):
        self.__stack.pop_overlay()

    def resize(self, width: float, height: float) -> None:
        raise NotImplementedError

    def draw(self) -> None:
        raise NotImplementedError


class OverlayStack:
    def push_overlay(self, overlay) -> None:
        raise NotImplementedError

    def pop_overlay(self) -> None:
        raise NotImplementedError
