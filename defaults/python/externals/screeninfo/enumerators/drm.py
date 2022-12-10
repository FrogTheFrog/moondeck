import os
import typing as T

from screeninfo.common import Monitor, ScreenInfoError


def enumerate_monitors() -> T.Iterable[Monitor]:
    import ctypes
    import ctypes.util

    from screeninfo.util import load_library

    libdrm = load_library("drm")

    class DrmBase(ctypes.Structure):
        fd = None
        needs_free = False

    class DrmModeRes(DrmBase):
        _fields_ = [
            ("count_fbs", ctypes.c_int),
            ("_fbs", ctypes.POINTER(ctypes.c_uint32)),
            ("count_crtcs", ctypes.c_int),
            ("_crtcs", ctypes.POINTER(ctypes.c_uint32)),
            ("count_connectors", ctypes.c_int),
            ("_connectors", ctypes.POINTER(ctypes.c_uint32)),
            ("count_encoders", ctypes.c_int),
            ("_encoders", ctypes.POINTER(ctypes.c_uint32)),
            ("min_width", ctypes.c_uint32),
            ("max_width", ctypes.c_uint32),
            ("min_height", ctypes.c_uint32),
            ("max_height", ctypes.c_uint32),
        ]

        def __del__(self) -> None:
            if self.needs_free:
                libdrm.drmModeFreeResources(ctypes.byref(self))

        @property
        def crtcs(self) -> T.List["DrmModeCrtc"]:
            ret = []
            for i in range(self.count_crtcs):
                crtc = libdrm.drmModeGetCrtc(self.fd, self._crtcs[i]).contents
                crtc.fd = self.fd
                crtc.need_free = True
                ret.append(crtc)
            return ret

        @property
        def connectors(self) -> T.List["DrmModeConnector"]:
            ret = []
            for i in range(self.count_connectors):
                pconn = libdrm.drmModeGetConnector(
                    self.fd, self._connectors[i]
                )
                if not pconn:
                    continue
                conn = pconn.contents
                conn.fd = self.fd
                conn.need_free = True
                ret.append(conn)
            return ret

    class DrmModeModeInfo(DrmBase):
        DRM_DISPLAY_MODE_LEN = 32

        _fields_ = [
            ("clock", ctypes.c_uint32),
            ("hdisplay", ctypes.c_uint16),
            ("hsync_start", ctypes.c_uint16),
            ("hsync_end", ctypes.c_uint16),
            ("htotal", ctypes.c_uint16),
            ("hskew", ctypes.c_uint16),
            ("vdisplay", ctypes.c_uint16),
            ("vsync_start", ctypes.c_uint16),
            ("vsync_end", ctypes.c_uint16),
            ("vtotal", ctypes.c_uint16),
            ("vscan", ctypes.c_uint16),
            ("vrefresh", ctypes.c_uint32),
            ("flags", ctypes.c_uint32),
            ("type", ctypes.c_uint32),
            ("name", ctypes.c_char * DRM_DISPLAY_MODE_LEN),
        ]

        def __del__(self) -> None:
            if self.needs_free:
                libdrm.drmModeFreeModeInfo(ctypes.byref(self))

    class DrmModeConnector(DrmBase):
        DRM_MODE_CONNECTED = 1
        DRM_MODE_DISCONNECTED = 2
        DRM_MODE_UNKNOWNCONNECTION = 3

        DRM_MODE_SUBPIXEL_UNKNOWN = 1
        DRM_MODE_SUBPIXEL_HORIZONTAL_RGB = 2
        DRM_MODE_SUBPIXEL_HORIZONTAL_BGR = 3
        DRM_MODE_SUBPIXEL_VERTICAL_RGB = 4
        DRM_MODE_SUBPIXEL_VERTICAL_BGR = 5
        DRM_MODE_SUBPIXEL_NONE = 6

        DRM_MODE_CONNECTOR_Unknown = 0
        DRM_MODE_CONNECTOR_VGA = 1
        DRM_MODE_CONNECTOR_DVII = 2
        DRM_MODE_CONNECTOR_DVID = 3
        DRM_MODE_CONNECTOR_DVIA = 4
        DRM_MODE_CONNECTOR_Composite = 5
        DRM_MODE_CONNECTOR_SVIDEO = 6
        DRM_MODE_CONNECTOR_LVDS = 7
        DRM_MODE_CONNECTOR_Component = 8
        DRM_MODE_CONNECTOR_9PinDIN = 9
        DRM_MODE_CONNECTOR_DisplayPort = 10
        DRM_MODE_CONNECTOR_HDMIA = 11
        DRM_MODE_CONNECTOR_HDMIB = 12
        DRM_MODE_CONNECTOR_TV = 13
        DRM_MODE_CONNECTOR_eDP = 14
        DRM_MODE_CONNECTOR_VIRTUAL = 15
        DRM_MODE_CONNECTOR_DSI = 16
        DRM_MODE_CONNECTOR_DPI = 17
        DRM_MODE_CONNECTOR_WRITEBACK = 18
        DRM_MODE_CONNECTOR_SPI = 19

        _fields_ = [
            ("connector_id", ctypes.c_uint32),
            ("encoder_id", ctypes.c_uint32),
            ("connector_type", ctypes.c_uint32),
            ("connector_type_id", ctypes.c_uint32),
            ("connection", ctypes.c_uint),
            ("mmWidth", ctypes.c_uint32),
            ("mmHeight", ctypes.c_uint32),
            ("subpixel", ctypes.c_uint),
            ("count_modes", ctypes.c_int),
            ("modes", ctypes.POINTER(DrmModeModeInfo)),
            ("count_props", ctypes.c_int),
            ("props", ctypes.POINTER(ctypes.c_uint32)),
            ("prop_values", ctypes.POINTER(ctypes.c_uint64)),
            ("count_encoders", ctypes.c_int),
            ("encoders", ctypes.POINTER(ctypes.c_uint32)),
        ]

        def __del__(self) -> None:
            if self.needs_free:
                libdrm.drmModeFreeConnector(ctypes.byref(self))

        @property
        def encoder(self) -> T.Optional["DrmModeEncoder"]:
            encoder_ptr = libdrm.drmModeGetEncoder(self.fd, self.encoder_id)
            if encoder_ptr:
                encoder = encoder_ptr.contents
                encoder.fd = self.fd
                encoder.need_free = True
                return T.cast("DrmModeEncoder", encoder)
            return None

    class DrmModeEncoder(DrmBase):
        _fields_ = [
            ("encoder_id", ctypes.c_uint32),
            ("encoder_type", ctypes.c_uint32),
            ("crtc_id", ctypes.c_uint32),
            ("possible_crtcs", ctypes.c_uint32),
            ("possible_clones", ctypes.c_uint32),
        ]

        def __del__(self) -> None:
            if self.need_free:
                libdrm.drmModeFreeEncoder(ctypes.byref(self))

        @property
        def crtc(self) -> "DrmModeCrtc":
            crtc = libdrm.drmModeGetCrtc(self.fd, self.crtc_id).contents
            crtc.fd = self.fd
            crtc.need_free = True
            return T.cast("DrmModeCrtc", crtc)

    class DrmModeCrtc(DrmBase):
        _fields_ = [
            ("crtc_id", ctypes.c_uint32),
            ("buffer_id", ctypes.c_uint32),
            ("x", ctypes.c_uint32),
            ("y", ctypes.c_uint32),
            ("width", ctypes.c_uint32),
            ("height", ctypes.c_uint32),
            ("mode_valid", ctypes.c_int),
            ("mode", DrmModeModeInfo),
            ("gamma_size", ctypes.c_int),
        ]

        def __del__(self) -> None:
            if self.need_free:
                libdrm.drmModeFreeCrtc(ctypes.byref(self))

    libdrm.drmModeGetResources.argtypes = [ctypes.c_int]
    libdrm.drmModeGetResources.restype = ctypes.POINTER(DrmModeRes)
    libdrm.drmModeFreeResources.argtypes = [ctypes.POINTER(DrmModeRes)]
    libdrm.drmModeFreeResources.restype = None
    libdrm.drmModeGetConnector.argtypes = [ctypes.c_int, ctypes.c_uint32]
    libdrm.drmModeGetConnector.restype = ctypes.POINTER(DrmModeConnector)
    libdrm.drmModeFreeConnector.argtypes = [ctypes.POINTER(DrmModeConnector)]
    libdrm.drmModeFreeConnector.restype = None
    libdrm.drmModeGetEncoder.argtypes = [ctypes.c_int, ctypes.c_uint32]
    libdrm.drmModeGetEncoder.restype = ctypes.POINTER(DrmModeEncoder)
    libdrm.drmModeFreeEncoder.argtypes = [ctypes.POINTER(DrmModeEncoder)]
    libdrm.drmModeFreeEncoder.restype = None
    libdrm.drmModeGetCrtc.argtypes = [ctypes.c_int, ctypes.c_uint32]
    libdrm.drmModeGetCrtc.restype = ctypes.POINTER(DrmModeCrtc)
    libdrm.drmModeFreeCrtc.argtypes = [ctypes.POINTER(DrmModeCrtc)]
    libdrm.drmModeFreeCrtc.restype = None

    DRM_MAX_MINOR = 16
    DRM_DIR_NAME = "/dev/dri"
    DRM_DEV_NAME = "%s/card%d"

    def get_connector_name(connector: "DrmModeConnector") -> str:
        try:
            prefix = {
                DrmModeConnector.DRM_MODE_CONNECTOR_Unknown: "Unknown",
                DrmModeConnector.DRM_MODE_CONNECTOR_VGA: "VGA",
                DrmModeConnector.DRM_MODE_CONNECTOR_DVII: "DVI-I",
                DrmModeConnector.DRM_MODE_CONNECTOR_DVID: "DVI-D",
                DrmModeConnector.DRM_MODE_CONNECTOR_DVIA: "DVI-A",
                DrmModeConnector.DRM_MODE_CONNECTOR_Composite: "Composite",
                DrmModeConnector.DRM_MODE_CONNECTOR_SVIDEO: "SVIDEO",
                DrmModeConnector.DRM_MODE_CONNECTOR_LVDS: "LVDS",
                DrmModeConnector.DRM_MODE_CONNECTOR_Component: "Component",
                DrmModeConnector.DRM_MODE_CONNECTOR_9PinDIN: "DIN",
                DrmModeConnector.DRM_MODE_CONNECTOR_DisplayPort: "DP",
                DrmModeConnector.DRM_MODE_CONNECTOR_HDMIA: "HDMI-A",
                DrmModeConnector.DRM_MODE_CONNECTOR_HDMIB: "HDMI-B",
                DrmModeConnector.DRM_MODE_CONNECTOR_TV: "TV",
                DrmModeConnector.DRM_MODE_CONNECTOR_eDP: "eDP",
                DrmModeConnector.DRM_MODE_CONNECTOR_VIRTUAL: "Virtual",
                DrmModeConnector.DRM_MODE_CONNECTOR_DSI: "DSI",
                DrmModeConnector.DRM_MODE_CONNECTOR_DPI: "DPI",
                DrmModeConnector.DRM_MODE_CONNECTOR_WRITEBACK: "Writeback",
                DrmModeConnector.DRM_MODE_CONNECTOR_SPI: "SPI",
            }[connector.connector_type]
        except KeyError:
            prefix = "Unknown"
        return f"{prefix}-{connector.connector_type_id}"

    for card_no in range(DRM_MAX_MINOR):
        card_path = DRM_DEV_NAME % (DRM_DIR_NAME, card_no)
        try:
            fd = os.open(card_path, os.O_RDONLY)
        except OSError:
            continue
        if fd < 0:
            continue

        try:
            res = libdrm.drmModeGetResources(fd)
            if not res:
                raise ScreenInfoError("Failed to get drm resources")

            res = res.contents
            res.fd = fd
            res.needs_free = True

            for connector in res.connectors:
                if connector.connection == DrmModeConnector.DRM_MODE_CONNECTED:
                    crtc = connector.encoder.crtc
                    yield Monitor(
                        x=crtc.x,
                        y=crtc.y,
                        width=crtc.width,
                        height=crtc.height,
                        width_mm=connector.mmWidth,
                        height_mm=connector.mmHeight,
                        name=get_connector_name(connector),
                    )

        finally:
            os.close(fd)
