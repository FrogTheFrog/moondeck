import typing as T

from screeninfo import enumerators
from screeninfo.common import Enumerator, Monitor, ScreenInfoError

ENUMERATOR_MAP = {
    Enumerator.Windows: enumerators.windows,
    Enumerator.Cygwin: enumerators.cygwin,
    Enumerator.Xrandr: enumerators.xrandr,
    Enumerator.Xinerama: enumerators.xinerama,
    Enumerator.DRM: enumerators.drm,
    Enumerator.OSX: enumerators.osx,
}


def get_monitors(
    name: T.Union[Enumerator, str, None] = None
) -> T.List[Monitor]:
    """Returns a list of :class:`Monitor` objects based on active monitors."""
    if name is not None:
        return list(ENUMERATOR_MAP[Enumerator(name)].enumerate_monitors())

    for enumerator in ENUMERATOR_MAP.keys():
        try:
            monitors = get_monitors(enumerator)
        except Exception as ex:
            monitors = []

        if monitors:
            return monitors

    raise ScreenInfoError("No enumerators available")
