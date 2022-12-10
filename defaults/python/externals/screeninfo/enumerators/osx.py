import typing as T

from screeninfo.common import Monitor


# https://developer.apple.com/documentation/appkit/nsscreen/1388371-main
# first entry in array is always the primary screen
def check_primary(screens: T.Any, screen: T.Any) -> bool:
    return screen == screens[0]


def enumerate_monitors() -> T.Iterable[Monitor]:
    from AppKit import NSScreen

    screens = NSScreen.screens()

    for screen in screens:
        f = screen.frame
        if callable(f):
            f = f()

        yield Monitor(
            x=int(f.origin.x),
            y=int(f.origin.y),
            width=int(f.size.width),
            height=int(f.size.height),
            is_primary=check_primary(screens, screen),
        )
