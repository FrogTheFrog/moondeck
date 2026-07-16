# Warning! Slow to load, only import this module lazily!
import pyglet
from datetime import datetime, timedelta, timezone

from .pallete import TEXT_COLOR, ACTIVE_COLOR, INACTIVE_COLOR, DEFAULT_FONT
from .mainscreen import MainScreenRunning
from .overlay import OverlayStack


class LoadingBar:
    def __init__(self):
        self.__batch = pyglet.graphics.Batch()
        self.__background_bar = pyglet.shapes.Rectangle(x=0, y=0, width=0, height=0, color=INACTIVE_COLOR, batch=self.__batch)
        self.__moving_bar = pyglet.shapes.Rectangle(x=0, y=0, width=0, height=0, color=ACTIVE_COLOR, batch=self.__batch)
        self.__scroll_x_percent = 0

    def set_bar_pos(self, percent: float):
        self.__scroll_x_percent = percent
        percent = percent / 100

        start_x = self.__background_bar.x - self.__moving_bar.width
        self.__moving_bar.x = start_x + ((self.__background_bar.width + self.__moving_bar.width) * percent)

    def resize(self, width: float, height: float):
        width_ratio = 8/10
        height_ratio = 1/100

        self.__background_bar.x = (1 - width_ratio) * width / 2
        self.__background_bar.y = self.__moving_bar.y = height_ratio * height * 15
        self.__background_bar.width = width_ratio * width
        self.__background_bar.height = self.__moving_bar.height = height_ratio * height / 1.5

        self.set_bar_pos(self.__scroll_x_percent)
        self.__moving_bar.width = (1 - width_ratio) * width * 1.25

    def draw(self):
        pyglet.gl.glEnable(pyglet.gl.GL_SCISSOR_TEST)
        pyglet.gl.glScissor(int(self.__background_bar.x), int(self.__background_bar.y),
                            int(self.__background_bar.width), int(self.__background_bar.height))

        next_pos = self.__scroll_x_percent + 1
        next_pos = 0 if next_pos > 100 else next_pos
        self.set_bar_pos(next_pos)

        self.__batch.draw()

        pyglet.gl.glDisable(pyglet.gl.GL_SCISSOR_TEST)

class LoadingLabel:
    def __init__(self, text: str):
        def make_label():
            return pyglet.text.Label(font_name=DEFAULT_FONT, weight="normal", color=TEXT_COLOR, anchor_y="top")

        self.__label_main = make_label()
        self.__label_repeat = make_label()
        self.__scroll_x = 0

        self.set_text(text=text)

    def resize(self, width: float, height: float):
        width_ratio = 8/10
        height_ratio = 1/100

        self.__x = (1 - width_ratio) * width / 2
        self.__width = round(width * width_ratio / 2)
        self.__scroll_speed = self.__width / 320

        self.__label_main.x = self.__label_repeat.x = self.__x
        self.__label_main.y = self.__label_repeat.y = height_ratio * height * 15

        font_size_pts = 34
        self.__label_main.font_size = self.__label_repeat.font_size = int(((width_ratio * width) / font_size_pts) * 0.83)

    def set_text(self, text):
        self.__label_main.text = self.__label_repeat.text = text

    def draw(self):
        if self.__label_main.content_width <= self.__width:
            self.__label_main.draw()
            return
        
        pyglet.gl.glEnable(pyglet.gl.GL_SCISSOR_TEST)
        pyglet.gl.glScissor(int(self.__x), int(self.__label_main.y - self.__label_main.content_height),
                            int(self.__width), int(self.__label_main.content_height))

        def set_scroll_offset(offset):
            distance_between_labels = 60
            self.__scroll_x = offset
            self.__label_main.x = self.__x - self.__scroll_x
            self.__label_repeat.x = self.__label_main.x + self.__label_main.content_width + distance_between_labels

        set_scroll_offset(self.__scroll_x + self.__scroll_speed)

        if self.__label_repeat.x < self.__x:
            set_scroll_offset(self.__x - self.__label_repeat.x)

        self.__label_main.draw()
        self.__label_repeat.draw()

        pyglet.gl.glDisable(pyglet.gl.GL_SCISSOR_TEST)


class WolScreen(MainScreenRunning):
    def __init__(self, stack: OverlayStack, text: str):
        super().__init__(stack)

        self.__label = LoadingLabel(text)
        self.__bar = LoadingBar()

    def set_label_text(self, text: str):
        self.__label.set_text(text)

    def resize(self, width: float, height: float):
        super().resize(width=width, height=height)
        self.__label.resize(width=width, height=height)
        self.__bar.resize(width=width, height=height)

    def draw(self):
        super().draw()
        self.__label.draw()
        self.__bar.draw()
