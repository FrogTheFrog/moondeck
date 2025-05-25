import logging
import sys

from pathlib import Path
from logging.handlers import RotatingFileHandler


def set_logger_settings(filename: str | Path | None, rotate: bool = True, log_preamble: str | None = None, print_to_stdout: bool = False, verbose: bool = False):
    handlers = []

    if filename is not None:
        handler = RotatingFileHandler(
            filename=filename,
            mode='a' if rotate else 'w',
            maxBytes=1024000 if rotate else 0,
            backupCount=2 if rotate else 0
        )

        if log_preamble is not None:
            optional_separator = "\n\n" if Path(filename).stat().st_size > 0 else ""

            handler.setFormatter(logging.Formatter("%(message)s"))
            handler.emit(logging.makeLogRecord({"msg": f"{optional_separator}{log_preamble}"}))

        handler.setFormatter(logging.Formatter(
            "[%(asctime)s] %(levelname)s: %(message)s"))
        handlers.append(handler)

    if print_to_stdout:
        class CustomInfoLevelFormatter(logging.Formatter):
            def __init__(self, info_fmt: str, *args, validate=True, defaults=None, **kwargs):
                self._info_style = logging.PercentStyle(
                    info_fmt, defaults=defaults)
                if validate:
                    self._info_style.validate()

                super().__init__(*args, validate=validate, defaults=defaults, **kwargs)

            def formatMessage(self, record):
                if record.levelno == logging.INFO:
                    return self._info_style.format(record)
                return self._style.format(record)

        handler = logging.StreamHandler(sys.stdout)

        if log_preamble is not None and verbose:
            handler.setFormatter(logging.Formatter("[DEBUG] %(message)s"))
            handler.emit(logging.makeLogRecord({"msg": f"{log_preamble}"}))

        handler.setFormatter(CustomInfoLevelFormatter(info_fmt="%(message)s",
                                                      fmt="[%(levelname)s] %(message)s"))
        handlers.append(handler)

    logging.basicConfig(handlers=handlers,
                        level=logging.INFO,
                        force=True)

    if verbose:
        enable_debug_level()


def enable_debug_level():
    logging.getLogger().setLevel(logging.DEBUG)


logger = logging.getLogger()
