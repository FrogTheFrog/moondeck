# Warning! Slow to load, only import this module lazily!
import pyglet

from .overlay import Overlay, OverlayStack


class Canvas(pyglet.window.Window, OverlayStack):
    def __init__(self):
        super().__init__(fullscreen=True, visible=False, resizable=True, caption="MoonDeck")
        self.__overlays: list[Overlay] = []
        self.__last_size = {}
        self.set_mouse_visible(False)

    def push_overlay(self, overlay: Overlay) -> None:
        self.__overlays.append(overlay)
        overlay.resize(width=self.width, height=self.height)

    def pop_overlay(self) -> None:
        self.__overlays.pop()

    def on_resize(self, width: float, height: float):
        self.handle_resize(width=width, height=height)

    def on_show(self):
        self.handle_resize(width=self.width, height=self.height)

    def on_draw(self):
        overlay_size = len(self.__overlays)
        last_overlay = self.__overlays[overlay_size - 1] if overlay_size > 0 else None

        self.clear()
        if last_overlay:
            last_overlay.draw()

        if not self.visible:
            self.set_visible(True)
    
    def handle_resize(self, width: float, height: float):
        size = {"width": width, "height": height}
        if self.__last_size != size:
            self.__last_size = size

            for overlay in self.__overlays:
                overlay.resize(width=width, height=height)

    # A workaround and verification for not capturing the KB+M
    def _update_exclusivity(self):
        orig_value = self._fullscreen
        self._fullscreen = False
        super()._update_exclusivity()
        self._fullscreen = orig_value

        assert not self._applied_mouse_exclusive
        assert not self._applied_keyboard_exclusive
