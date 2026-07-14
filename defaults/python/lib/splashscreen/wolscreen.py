# Warning! Slow to load, only import this module lazily!
import pyglet
from datetime import datetime, timedelta, timezone

from .pallete import TEXT_COLOR, ACTIVE_COLOR, INACTIVE_COLOR
from .overlay import Overlay, OverlayStack


class LoadingBar:
    def __init__(self):
        self.current_block = 0
        self.blocks : list[pyglet.shapes.Rectangle] = []
        self.batch = pyglet.graphics.Batch()

        for _ in range(15):
            self.blocks.append(pyglet.shapes.Rectangle(x=0, y=0, width=0, height=0,
                                                       color=INACTIVE_COLOR, batch=self.batch)) # type: ignore

    def resize(self, width: float, height: float):
        width_ratio = 4/6
        bar_width = width_ratio * width

        bar_slice = bar_width / len(self.blocks)
        gap_size = bar_slice / 4
        block_size = bar_slice - gap_size

        x = ((1 - width_ratio) / 2) * width
        y = height / 2 - 5

        for block in self.blocks:
            block.width=block_size
            block.height=block_size
            block.y = y - block_size
            block.x = x

            x += block_size + gap_size

    def draw(self):
        refresh_interval = timedelta(milliseconds=100)
        now = datetime.now(timezone.utc)
        if now - getattr(self, "__last_color_swap", now - timedelta(days=100)) > refresh_interval:
            setattr(self, "__last_color_swap", now)

            current = self.current_block
            next = self.current_block + 1

            if next >= len(self.blocks):
                next = 0

            self.blocks[current].color = INACTIVE_COLOR
            self.blocks[next].color = ACTIVE_COLOR
            self.current_block = next

        self.batch.draw()


class LoadingLabel:
    def __init__(self, text: str):
        def make_label():
            return pyglet.text.Label(x=0, y=0, anchor_y="bottom",
                                     weight="bold", font_size=0,
                                     color=TEXT_COLOR)

        self.__label_main = make_label()
        self.__label_repeat = make_label()
        self.__scroll_x = 0

        self.set_text(text=text)

    def resize(self, width: float, height: float):
        width_ratio = 4/6
        self.__x = ((1 - width_ratio) / 2) * width
        self.__width = round(width * width_ratio)
        self.__scroll_speed = self.__width / 320

        self.__label_main.x = self.__label_repeat.x = self.__x
        self.__label_main.y = self.__label_repeat.y = height / 2 + 5

        font_size_pts = 24
        self.__label_main.font_size = self.__label_repeat.font_size = int(((width_ratio * width) / font_size_pts) * 0.83)

    def set_text(self, text):
        self.__label_main.text = self.__label_repeat.text = text

    def draw(self):
        if self.__label_main.content_width <= self.__width:
            self.__label_main.draw()
            return
        
        pyglet.gl.glEnable(pyglet.gl.GL_SCISSOR_TEST)
        pyglet.gl.glScissor(int(self.__x), int(self.__label_main.y), self.__width, self.__label_main.content_height)

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


class WolScreen(Overlay):
    def __init__(self, stack: OverlayStack, text: str):
        super().__init__(stack)

        self.__label = LoadingLabel(text)
        self.__bar = LoadingBar()

    def set_label_text(self, text: str):
        self.__label.set_text(text)

    def resize(self, width: float, height: float):
        self.__label.resize(width=width, height=height)
        self.__bar.resize(width=width, height=height)

    def draw(self):
        self.__label.draw()
        self.__bar.draw()
