# Warning! Slow to load, only import this module lazily!
import pyglet
import asyncio

from typing import Optional
from datetime import datetime, timedelta, timezone
from ..logger import logger
from ..utils import wake_on_lan


# https://paletton.com/#uid=13w120knwheMwWhDouE8X6E6K00
INACTIVE_COLOR = (25, 30, 34)
ACTIVE_COLOR = (7, 144, 242)
TEXT_COLOR = (255, 255, 255)


class LoadingBar:
    def __init__(self, width, height):
        self.current_block = 0
        self.blocks : list[pyglet.shapes.Rectangle] = []
        self.batch = pyglet.graphics.Batch()

        for _ in range(15):
            self.blocks.append(pyglet.shapes.Rectangle(x=0, y=0, width=0, height=0,
                                                       color=INACTIVE_COLOR, batch=self.batch)) # type: ignore

        self.resize(width, height)

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
    def __init__(self, width, height):
        def make_label():
            return pyglet.text.Label(x=0, y=0, anchor_y="bottom",
                                     weight="bold", font_size=0,
                                     color=TEXT_COLOR)

        self.__label_main = make_label()
        self.__label_repeat = make_label()
        self.__scroll_x = 0
        self.resize(width, height)

    def resize(self, width, height):
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


class Canvas(pyglet.window.Window):
    def __init__(self):
        super().__init__(fullscreen=False, visible=False, resizable=True, caption="MoonDeck WOL Splash")

        self.label = LoadingLabel(width=self.width, height=self.height)
        self.bar = LoadingBar(width=self.width, height=self.height)

    def on_resize(self, width, height):
        self.handle_resize(width=width, height=height)

    def on_show(self):
        self.handle_resize(width=self.width, height=self.height)

    def on_draw(self):
        self.clear()
        self.label.draw()
        self.bar.draw()

        if not self.visible:
            self.set_visible(True)
    
    def handle_resize(self, width, height):
        size = {"width": width, "height": height}
        if getattr(self, "__last_size", {}) != size:
            setattr(self, "__last_size", size)
        
            self.label.resize(width=width, height=height)
            self.bar.resize(width=width, height=height)


class WolSplashScreen:
    def __init__(self, address: str, mac: str, timeout: int, hostname: str, wol_port: int, custom_wol_exec: Optional[str]):
        self.address = address
        self.hostname = hostname
        self.mac = mac
        self.wol_port = wol_port
        self.custom_wol_exec = custom_wol_exec
        if timeout > 0:
            self.timeout_end = datetime.now(timezone.utc) + timedelta(seconds=timeout)
        else:
            self.timeout_end = None

    async def __run_loop(self):
        while not self.close_flag:
            pyglet.clock.tick()
            pyglet.app.platform_event_loop.step(0.0167)

            for window in pyglet.app.windows:
                window.switch_to()
                window.dispatch_events()
                window.dispatch_event('on_draw')
                window.flip()
            await asyncio.sleep(0)

        for window in list(pyglet.app.windows):
            window.close()

    async def __aenter__(self):
        self.close_flag = True
        self.wol_task = None
        self.loop_task = None

        if self.timeout_end is None:
            return self
        
        self.canvas = Canvas() # Added to pyglet.app.windows
        self.canvas.label.set_text(text=f"Checking connection to {self.hostname}...")
        self.close_flag = False
        self.wol_task = asyncio.create_task(wake_on_lan(hostname=self.hostname,
                                                        address=self.address,
                                                        mac=self.mac,
                                                        port=self.wol_port,
                                                        custom_exec=self.custom_wol_exec))
        self.loop_task = asyncio.create_task(self.__run_loop())
        return self

    async def __aexit__(self, exc_type, exc, tb):
        self.close_flag = True
        if self.loop_task:
            await self.loop_task

            if self.wol_task:
                _, pending = await asyncio.wait({self.wol_task}, timeout=1)
                if self.wol_task in pending:
                    self.wol_task.cancel()
                    await asyncio.wait({self.wol_task}) 

            self.loop_task.result()

    def update(self, buddy_status, server_status) -> bool:
        logger.info(f"Buddy: {buddy_status}, Server: {server_status}")
        if self.close_flag or self.timeout_end is None:
            return False
        
        if self.wol_task and self.wol_task.done():
            self.wol_task.result()
            self.wol_task = None

        if ((buddy_status is None or buddy_status) and server_status) or (datetime.now(timezone.utc) > self.timeout_end):
            return False
        
        self.canvas.label.set_text(text=f"Waiting for {self.hostname}...")
        return True