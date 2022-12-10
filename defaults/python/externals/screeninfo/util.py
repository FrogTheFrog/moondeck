import ctypes.util
import typing as T

from screeninfo.common import ScreenInfoError


def load_library(name: str) -> T.Any:
    path = ctypes.util.find_library(name)
    if not path:
        raise ScreenInfoError("Could not load " + name)
    return ctypes.cdll.LoadLibrary(path)
