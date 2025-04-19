import tkinter as tk
import asyncio

from datetime import datetime, timedelta, timezone
from tkinter import font as tkFont
from .logger import logger
from .utils import wake_on_lan


# https://paletton.com/#uid=13w120knwheMwWhDouE8X6E6K00
BG_COLOR = "#000000"
INACTIVE_COLOR = "#191E22"
ACTIVE_COLOR = "#0791F2"
TEXT_COLOR = "#FFFFFF"


class LoadingLabel(tk.Frame):
    def __init__(self, parent, anchor=None, fg=None, text=None, **kwargs):
        super().__init__(parent, **kwargs)

        self.grid_propagate(False)

        self.default_size = 24
        self.label_font = tkFont.Font(self, size=self.default_size, weight="bold")
        self.label = tk.Label(self, anchor=anchor, fg=fg, bg=kwargs.get("bg", None), text=text, font=self.label_font)

        self.columnconfigure(0, weight=1)
        self.rowconfigure(0, weight=1)
        self.label.grid(column=0, row=0, sticky="sw")

        self.bind("<Configure>", self.on_resize)

    def on_resize(self, event):
        width = self.winfo_width()
        size = int((width / self.default_size) * 0.7)

        self.label_font.config(size=size)

    def set_text(self, text):
        self.label.config(text=text)


class LoadingBar(tk.Frame):
    def __init__(self, parent, **kwargs):
        super().__init__(parent, **kwargs)

        self.grid_propagate(False)
        self.rowconfigure(0, weight=1)

        self.current_block = 0
        self.blocks = []
        for i in range(15):
            self.columnconfigure(i, weight=1)
            block = tk.Frame(self, bg=INACTIVE_COLOR)
            block.grid(column=i, row=0, sticky="n")
            self.blocks.append(block)

        self.bind("<Destroy>", self.on_destroy)
        self.bind("<Configure>", self.on_resize)

    def on_destroy(self, event):
        self.blocks = []

    def on_resize(self, event):
        width = self.winfo_width()
        block_size = int(width / len(self.blocks))
        block_size = int(block_size - (block_size / 4))

        for block in self.blocks:
            block.config(width=block_size, height=block_size)

    def update_progress(self):
        current = self.current_block
        next = self.current_block + 1

        if next >= len(self.blocks):
            next = 0

        self.blocks[current].config(bg=INACTIVE_COLOR)
        self.blocks[next].config(bg=ACTIVE_COLOR)
        self.current_block = next


class WolSplashScreen:
    def __init__(self, address: str, mac: str, timeout: int):
        logger.info(f"WolSplashScreen.__init__ :: 1")
        if timeout > 0:
            logger.info(f"WolSplashScreen.__init__ :: 2")
            wake_on_lan(address=address, mac=mac)
            logger.info(f"WolSplashScreen.__init__ :: 3")
            self.timeout_end = datetime.now(timezone.utc) + timedelta(seconds=timeout)
            logger.info(f"WolSplashScreen.__init__ :: 4")
        else:
            logger.info(f"WolSplashScreen.__init__ :: 5")
            self.timeout_end = None
        logger.info(f"WolSplashScreen.__init__ :: 6")

    def __on_destroy(self, event):
        logger.info(f"WolSplashScreen.__on_destroy :: 1")
        self.destroy_flag = True

    async def __update_window(self):
        logger.info(f"WolSplashScreen.__update_window :: 1")
        async def run_loop(times):
            logger.info(f"WolSplashScreen.__update_window :: 2")
            while times > 0 and not self.destroy_flag:
                self.loading_bar.update_progress()
                self.root.update_idletasks()
                self.root.update()
                await asyncio.sleep(0.1)
                times = times - 1
            logger.info(f"WolSplashScreen.__update_window :: 3")

        while not self.close_flag and not self.destroy_flag:
            logger.info(f"WolSplashScreen.__update_window :: 4")
            await run_loop(1)
            logger.info(f"WolSplashScreen.__update_window :: 5")

        logger.info(f"WolSplashScreen.__update_window :: 6")
        if not self.destroy_flag:
            logger.info(f"WolSplashScreen.__update_window :: 7")
            await run_loop(13)
            logger.info(f"WolSplashScreen.__update_window :: 8")
            if not self.destroy_flag:
                logger.info(f"WolSplashScreen.__update_window :: 9")
                self.root.destroy()   
                logger.info(f"WolSplashScreen.__update_window :: 10")
        logger.info(f"WolSplashScreen.__update_window :: 11")

    async def __aenter__(self):
        logger.info(f"WolSplashScreen.__aenter__ :: 1")
        self.close_flag = True
        self.destroy_flag = True
        self.task = None

        if self.timeout_end is None:
            logger.info(f"WolSplashScreen.__aenter__ :: 2")
            return self

        logger.info(f"WolSplashScreen.__aenter__ :: 3")
        self.root = tk.Tk()
        self.root.config(bg=BG_COLOR)
        self.root.minsize(width=1280, height=720)
        self.root.attributes('-fullscreen', True)
        self.root.bind("<Destroy>", self.__on_destroy)
        logger.info(f"WolSplashScreen.__aenter__ :: 4")

        # Row 0
        self.root.rowconfigure(0, weight=6)
        logger.info(f"WolSplashScreen.__aenter__ :: 5")

        # Row 1
        self.root.rowconfigure(1, weight=4)
        logger.info(f"WolSplashScreen.__aenter__ :: 6")

        self.loading_text = LoadingLabel(self.root, bg=BG_COLOR, fg=TEXT_COLOR, text="Checking connection to the host...", anchor="sw")
        logger.info(f"WolSplashScreen.__aenter__ :: 7")
        self.loading_text.grid(row=1, column=1, sticky="nesw", pady=5)
        logger.info(f"WolSplashScreen.__aenter__ :: 8")

        # Row 2
        self.root.rowconfigure(2, weight=4, minsize=50)
        logger.info(f"WolSplashScreen.__aenter__ :: 9")

        self.root.columnconfigure(0, weight=3)
        self.root.columnconfigure(1, weight=12)
        logger.info(f"WolSplashScreen.__aenter__ :: 10")

        self.loading_bar = LoadingBar(self.root, bg=BG_COLOR)
        logger.info(f"WolSplashScreen.__aenter__ :: 11")
        self.loading_bar.grid(row=2, column=1, sticky="nsew")
        self.root.columnconfigure(3, weight=3)
        logger.info(f"WolSplashScreen.__aenter__ :: 12")

        # Row 3
        self.root.rowconfigure(3, weight=6)

        logger.info(f"WolSplashScreen.__aenter__ :: 13")
        
        self.close_flag = False
        self.destroy_flag = False
        self.task = asyncio.create_task(self.__update_window())
        logger.info(f"WolSplashScreen.__aenter__ :: 14")
        return self

    async def __aexit__(self, exc_type, exc, tb):
        logger.info(f"WolSplashScreen.__aexit__ :: 1")
        self.close_flag = True
        if self.task:
            logger.info(f"WolSplashScreen.__aexit__ :: 2")
            await self.task
            logger.info(f"WolSplashScreen.__aexit__ :: 3")

    def update(self, buddy_status, server_status) -> bool:
        logger.info(f"Buddy: {buddy_status}, Server: {server_status}")
        if self.close_flag or self.destroy_flag:
            return False

        if ((buddy_status is None or buddy_status) and server_status) or (datetime.now(timezone.utc) > self.timeout_end):
            return False
        
        self.loading_text.set_text(text="Waiting for the host...")
        return True
