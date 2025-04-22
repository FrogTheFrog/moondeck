import externals.pyglet as pyglet
import asyncio

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
                                                       color=INACTIVE_COLOR, batch=self.batch))

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
    def __init__(self, width, height, text):
        self.__label = pyglet.text.Label(x=0, y=0, anchor_y="bottom",
                                         text=text, weight="bold", font_size=0,
                                         color=TEXT_COLOR)
        self.resize(width, height)

    def resize(self, width, height):
        width_ratio = 4/6
        self.__label.x = ((1 - width_ratio) / 2) * width
        self.__label.y = height / 2 + 5

        font_size_pts = 24
        self.__label.font_size = int(((width_ratio * width) / font_size_pts) * 0.83)

    def set_text(self, text):
        self.__label.text = text

    def draw(self):
        self.__label.draw()


class Canvas(pyglet.window.Window):
    def __init__(self):
        super().__init__(fullscreen=True, visible=False, caption="MoonDeck WOL Splash")

        self.label = LoadingLabel(width=self.width, height=self.height, text="Checking connection to the host...")
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
    def __init__(self, address: str, mac: str, timeout: int):
        if timeout > 0:
            wake_on_lan(address=address, mac=mac)
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
        self.task = None

        if self.timeout_end is None:
            return self
        
        self.canvas = Canvas() # Added to pyglet.app.windows
        self.close_flag = False
        self.task = asyncio.create_task(self.__run_loop())
        return self

    async def __aexit__(self, exc_type, exc, tb):
        self.close_flag = True
        if self.task:
            await self.task

    def update(self, buddy_status, server_status) -> bool:
        logger.info(f"Buddy: {buddy_status}, Server: {server_status}")
        if self.close_flag:
            return False

        if ((buddy_status is None or buddy_status) and server_status) or (datetime.now(timezone.utc) > self.timeout_end):
            return False
        
        self.canvas.label.set_text(text="Waiting for the host...")
        return True