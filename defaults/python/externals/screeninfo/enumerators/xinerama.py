import typing as T

from screeninfo.common import Monitor, ScreenInfoError


def enumerate_monitors() -> T.Iterable[Monitor]:
    import ctypes

    from screeninfo.util import load_library

    class XineramaScreenInfo(ctypes.Structure):
        _fields_ = [
            ("screen_number", ctypes.c_int),
            ("x", ctypes.c_short),
            ("y", ctypes.c_short),
            ("width", ctypes.c_short),
            ("height", ctypes.c_short),
        ]

    xlib = load_library("X11")
    xlib.XOpenDisplay.argtypes = [ctypes.c_char_p]
    xlib.XOpenDisplay.restype = ctypes.POINTER(ctypes.c_void_p)
    xlib.XFree.argtypes = [ctypes.c_void_p]
    xlib.XFree.restype = None

    xinerama = load_library("Xinerama")

    display = xlib.XOpenDisplay(b"")
    if not display:
        raise ScreenInfoError("Could not open display")

    try:
        if not xinerama.XineramaIsActive(display):
            raise ScreenInfoError("Xinerama is not active")

        number = ctypes.c_int()
        xinerama.XineramaQueryScreens.restype = ctypes.POINTER(
            XineramaScreenInfo
        )
        infos = xinerama.XineramaQueryScreens(display, ctypes.byref(number))
        infos = ctypes.cast(
            infos, ctypes.POINTER(XineramaScreenInfo * number.value)
        ).contents

        for info in infos:
            yield Monitor(
                x=info.x, y=info.y, width=info.width, height=info.height
            )

        xlib.XFree(infos)

    finally:
        xlib.XCloseDisplay.restype = ctypes.POINTER(ctypes.c_void_p)
        xlib.XCloseDisplay(display)
