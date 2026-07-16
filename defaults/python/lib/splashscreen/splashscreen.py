# Warning! Slow to load, only import this module lazily!
import pyglet
import asyncio
import contextlib
import pathlib 

from .canvas import Canvas


class SplashScreen:
    def __init__(self):
        script_dir = pathlib.Path(__file__).parent.resolve()
        pyglet.font.add_file(str(script_dir.joinpath("./IBM_Plex_Sans/IBMPlexSans-VariableFont_wdth,wght.ttf")))

    async def __run_loop(self):
        try:
            while not self.close_flag:
                pyglet.clock.tick()
                pyglet.app.platform_event_loop.step(0.0167)

                for window in pyglet.app.windows:
                    window.switch_to()
                    window.dispatch_events()
                    window.dispatch_event('on_draw')
                    window.flip()
                await asyncio.sleep(0)
        finally:
            for window in list(pyglet.app.windows):
                window.close()

    async def __aenter__(self):
        self.close_flag = False
        self.loop_task = asyncio.create_task(self.__run_loop())
        self.canvas = Canvas() # Added to pyglet.app.windows
        return self

    async def __aexit__(self, exc_type, exc, tb):
        self.close_flag = True
        if self.loop_task:
            with contextlib.suppress(asyncio.CancelledError):
                await self.loop_task
