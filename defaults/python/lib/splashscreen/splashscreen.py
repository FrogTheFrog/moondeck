# Warning! Slow to load, only import this module lazily!
import pyglet
import asyncio
import contextlib
import pathlib 

from .canvas import Canvas


class AsyncEventLoop(pyglet.app.EventLoop):
    def run(self, interval=1/60):
        # Copy-paste from source code
        self._interval = interval
        if interval is None:
            # User will schedule Window.draw manually
            pass
        elif interval == 0:
            self.clock.schedule(self._redraw_windows)
        else:
            self.clock.schedule_interval(self._redraw_windows, interval)

        self.has_exit = False
        pyglet.window.Window._enable_event_queue = False

        # Dispatch pending events
        for window in pyglet.app.windows:
            window.switch_to()
            window.dispatch_pending_events()

        self.__platform_event_loop = pyglet.app.platform_event_loop
        self.__platform_event_loop.start()
        self.dispatch_event('on_enter')
        self.is_running = True
        
        return asyncio.create_task(self.__run_async())

    async def __run_async(self):
        while not self.has_exit:
            timeout = self.idle()
            self.__platform_event_loop.step(0)
            try:
                await asyncio.sleep(timeout if timeout is not None else self._interval)
            except asyncio.CancelledError:
                self.exit()

        self.is_running = False
        self.dispatch_event('on_exit')
        self.__platform_event_loop.stop()


class SplashScreen:
    def __init__(self):
        script_dir = pathlib.Path(__file__).parent.resolve()
        pyglet.font.add_file(str(script_dir.joinpath("./IBM_Plex_Sans/IBMPlexSans-VariableFont_wdth,wght.ttf")))

        self.__original_event_loop = pyglet.app.event_loop
        self.__async_loop = None

    async def __aenter__(self):
        pyglet.app.event_loop = AsyncEventLoop()
        self.__async_loop = pyglet.app.event_loop.run()

        self.canvas = Canvas() # Added to pyglet.app.windows
        return self

    async def __aexit__(self, exc_type, exc, tb):
        if not self.__async_loop.done():
            self.__async_loop.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self.__async_loop

        pyglet.app.event_loop = self.__original_event_loop
