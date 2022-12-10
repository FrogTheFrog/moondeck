import sys
import typing as T

from screeninfo.common import Monitor, ScreenInfoError


def enumerate_monitors() -> T.Iterable[Monitor]:
    import ctypes
    import ctypes.util

    from screeninfo.util import load_library

    RR_Connected = 0

    class XRRCrtcInfo(ctypes.Structure):
        _fields_ = [
            ("timestamp", ctypes.c_ulong),
            ("x", ctypes.c_int),
            ("y", ctypes.c_int),
            ("width", ctypes.c_int),
            ("height", ctypes.c_int),
            ("mode", ctypes.c_long),
            ("rotation", ctypes.c_int),
            ("noutput", ctypes.c_int),
            ("outputs", ctypes.POINTER(ctypes.c_long)),
            ("rotations", ctypes.c_ushort),
            ("npossible", ctypes.c_int),
            ("possible", ctypes.POINTER(ctypes.c_long)),
        ]

    class XRRScreenResources(ctypes.Structure):
        _fields_ = [
            ("timestamp", ctypes.c_ulong),
            ("configTimestamp", ctypes.c_ulong),
            ("ncrtc", ctypes.c_int),
            ("crtcs", ctypes.POINTER(ctypes.c_ulong)),
            ("noutput", ctypes.c_int),
            ("outputs", ctypes.POINTER(ctypes.c_ulong)),
            ("nmode", ctypes.c_int),
            ("modes", ctypes.c_void_p),  # ctypes.POINTER(XRRModeInfo)
        ]

    class XRROutputInfo(ctypes.Structure):
        _fields_ = [
            ("timestamp", ctypes.c_ulong),
            ("crtc", ctypes.c_ulong),
            ("name", ctypes.c_char_p),
            ("nameLen", ctypes.c_int),
            ("mm_width", ctypes.c_ulong),
            ("mm_height", ctypes.c_ulong),
            ("connection", ctypes.c_ushort),
            ("subpixel_order", ctypes.c_ushort),
            ("ncrtc", ctypes.c_int),
            ("crtcs", ctypes.POINTER(ctypes.c_ulong)),
            ("nclone", ctypes.c_int),
            ("clones", ctypes.POINTER(ctypes.c_ulong)),
            ("nmode", ctypes.c_int),
            ("npreferred", ctypes.c_int),
            ("modes", ctypes.POINTER(ctypes.c_ulong)),
        ]

    def check_primary(display_id: int, crtc: XRRCrtcInfo) -> bool:
        return display_id == crtc.contents.outputs.contents.value

    xlib = load_library("X11")
    xlib.XOpenDisplay.argtypes = [ctypes.c_char_p]
    xlib.XOpenDisplay.restype = ctypes.POINTER(ctypes.c_void_p)

    xrandr = load_library("Xrandr")
    xrandr.XRRGetScreenResourcesCurrent.restype = ctypes.POINTER(
        XRRScreenResources
    )
    xrandr.XRRGetOutputInfo.restype = ctypes.POINTER(XRROutputInfo)
    xrandr.XRRGetCrtcInfo.restype = ctypes.POINTER(XRRCrtcInfo)

    display = xlib.XOpenDisplay(b"")
    if not display:
        raise ScreenInfoError("Could not open display")

    try:
        root_window = xlib.XDefaultRootWindow(display)
        screen_resources = xrandr.XRRGetScreenResourcesCurrent(
            display, root_window
        )

        for i in range(screen_resources.contents.noutput):
            output_info = xrandr.XRRGetOutputInfo(
                display, screen_resources, screen_resources.contents.outputs[i]
            )

            if output_info.contents.connection != RR_Connected:
                continue

            if not output_info.contents.crtc:
                continue

            try:
                crtc_info = xrandr.XRRGetCrtcInfo(
                    display,
                    ctypes.byref(output_info),
                    output_info.contents.crtc,
                )

                primary_id = xrandr.XRRGetOutputPrimary(display, root_window)

                try:
                    yield Monitor(
                        x=crtc_info.contents.x,
                        y=crtc_info.contents.y,
                        width=crtc_info.contents.width,
                        height=crtc_info.contents.height,
                        width_mm=output_info.contents.mm_width,
                        height_mm=output_info.contents.mm_height,
                        name=output_info.contents.name.decode(
                            sys.getfilesystemencoding()
                        ),
                        is_primary=check_primary(primary_id, crtc_info),
                    )

                finally:
                    xrandr.XRRFreeCrtcInfo(crtc_info)

            finally:
                xrandr.XRRFreeOutputInfo(output_info)

    finally:
        xlib.XCloseDisplay(display)
