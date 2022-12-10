import typing as T

from screeninfo.common import Monitor


def enumerate_monitors() -> T.Iterable[Monitor]:
    import ctypes

    LONG = ctypes.c_int32
    BOOL = ctypes.c_int
    HANDLE = ctypes.c_void_p
    HMONITOR = HANDLE
    HDC = HANDLE

    class RECT(ctypes.Structure):
        _fields_ = [
            ("left", LONG),
            ("top", LONG),
            ("right", LONG),
            ("bottom", LONG),
        ]

    user32 = ctypes.cdll.LoadLibrary("user32.dll")

    ptr_size = ctypes.sizeof(ctypes.c_void_p)
    if ptr_size == ctypes.sizeof(ctypes.c_long):
        WPARAM = ctypes.c_ulong
        LPARAM = ctypes.c_long
    elif ptr_size == ctypes.sizeof(ctypes.c_longlong):
        WPARAM = ctypes.c_ulonglong
        LPARAM = ctypes.c_longlong

    MonitorEnumProc = ctypes.CFUNCTYPE(
        BOOL, HMONITOR, HDC, ctypes.POINTER(RECT), LPARAM
    )

    user32.EnumDisplayMonitors.argtypes = [
        HANDLE,
        ctypes.POINTER(RECT),
        MonitorEnumProc,
        LPARAM,
    ]
    user32.EnumDisplayMonitors.restype = ctypes.c_bool

    monitors = []

    def check_primary(rct: T.Any) -> bool:
        return rct.left == 0 and rct.top == 0

    def callback(monitor: T.Any, dc: T.Any, rect: T.Any, data: T.Any) -> int:
        rct = rect.contents
        monitors.append(
            Monitor(
                x=rct.left,
                y=rct.top,
                width=rct.right - rct.left,
                height=rct.bottom - rct.top,
                is_primary=check_primary(rct),
            )
        )
        return 1

    user32.EnumDisplayMonitors(None, None, MonitorEnumProc(callback), 0)

    yield from monitors
