# Warning! Slow to load, only import this module lazily!
import pyglet

from .pallete import TEXT_COLOR, ACTIVE_COLOR, INACTIVE_COLOR
from .overlay import Overlay, OverlayStack


class MainScreenLabel(Overlay):
    def __init__(self, stack: OverlayStack):
        super().__init__(stack)

        self.__label_main = pyglet.text.Label(x=0, y=0, anchor_x='center', anchor_y='bottom',
                                              weight="bold", font_size=0, color=TEXT_COLOR,
                                              text="MoonDeck")
        
        self.__label_secondary = pyglet.text.Label(x=0, y=0, anchor_x='center', anchor_y='top',
                                                   weight="bold", font_size=0)

    def _set_suspended(self, suspended: bool):
        if suspended:
            self.__label_secondary.text = "Suspended"
            self.__label_secondary.color = INACTIVE_COLOR
        else:
            self.__label_secondary.text = "Running"
            self.__label_secondary.color = ACTIVE_COLOR

    def resize(self, width: float, height: float):
        width_ratio = 4/6
        center_width = width / 2
        center_height = height / 2
        gap = 20

        self.__label_main.x = center_width
        self.__label_main.y = center_height + (gap / 2)

        self.__label_secondary.x = center_width
        self.__label_secondary.y = center_height + (gap / 2)

        font_size_pts = 16
        self.__label_main.font_size = int(((width_ratio * width) / font_size_pts) * 0.83)
        self.__label_secondary.font_size = int(((width_ratio * width) / font_size_pts) * 0.4)

    def draw(self):
        self.__label_main.draw()
        self.__label_secondary.draw()


class MainScreenRunning(MainScreenLabel):
    def __init__(self, stack: OverlayStack):
        super().__init__(stack)
        self._set_suspended(suspended=False)


class MainScreenSuspended(MainScreenLabel):
    def __init__(self, stack: OverlayStack):
        super().__init__(stack)
        self._set_suspended(suspended=True)
