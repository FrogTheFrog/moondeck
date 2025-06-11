import logging
import sys

from pathlib import Path
from logging.handlers import RotatingFileHandler


def set_logger_settings(filename: str | Path | None, rotate: bool = True, log_preamble: str | None = None, print_to_std: bool = False, verbose: bool = False):
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

    if print_to_std:
        stdout_handler = logging.StreamHandler(sys.stdout)
        stderr_handler = logging.StreamHandler(sys.stderr)

        stdout_handler.setFormatter(logging.Formatter("%(message)s"))
        stderr_handler.setFormatter(logging.Formatter("%(message)s"))

        stdout_handler.addFilter(lambda record: record.levelno == logging.INFO)
        stderr_handler.addFilter(lambda record: record.levelno != logging.INFO)

        if log_preamble is not None and verbose:
            stderr_handler.emit(logging.makeLogRecord({"msg": f"{log_preamble}", "level": "DEBUG"}))

        handlers.append(stdout_handler)
        handlers.append(stderr_handler)

    logging.basicConfig(handlers=handlers,
                        level=logging.INFO,
                        force=True)

    if verbose:
        enable_debug_level()


def enable_debug_level():
    logging.getLogger().setLevel(logging.DEBUG)


logger = logging.getLogger()
