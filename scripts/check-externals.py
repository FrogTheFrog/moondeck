#!/usr/bin/env python3
"""Checks the vendored Python externals.

Default mode (any machine):
    Every package pinned in defaults/python/requirements-<arch>.txt must have the same
    version pinned in requirements.txt, and externals-<arch> must contain that version.

--smoke (run on each target architecture, ideally with `python3 -S`):
    Sets up sys.path exactly like moondeckrun.py does and imports every package from
    requirements.txt, so a missing or wrong-architecture native module fails here
    instead of on a device.
"""
import platform
import re
import sys
from pathlib import Path

PYTHON_DIR = Path(__file__).resolve().parent.parent / "defaults" / "python"
PIN = re.compile(r"^\s*([A-Za-z0-9_.-]+)\s*==\s*([^\s#]+)")


def read_pins(path: Path) -> dict[str, str]:
    pins = {}
    for line in path.read_text().splitlines():
        match = PIN.match(line)
        if match:
            pins[match.group(1).lower()] = match.group(2)
    return pins


def check_sync() -> list[str]:
    errors = []
    base = read_pins(PYTHON_DIR / "requirements.txt")
    for req in sorted(PYTHON_DIR.glob("requirements-*.txt")):
        arch = req.stem.removeprefix("requirements-")
        externals = PYTHON_DIR / f"externals-{arch}"
        for name, version in read_pins(req).items():
            if base.get(name) != version:
                errors.append(f"{req.name}: {name}=={version}, but requirements.txt pins {name}=={base.get(name)}")
            dist_info = externals / f"{name.replace('-', '_')}-{version}.dist-info"
            if not dist_info.is_dir():
                errors.append(f"{externals.name}: missing {dist_info.name} (run scripts/update-arch-externals.sh)")
        print(f"{req.name}: checked {len(read_pins(req))} package(s)")
    return errors


def smoke() -> list[str]:
    import importlib

    # Same order as add_plugin_to_path() in moondeckrun.py
    arch_dir = PYTHON_DIR / f"externals-{platform.machine()}"
    for directory in (PYTHON_DIR / "lib", arch_dir, PYTHON_DIR / "externals"):
        sys.path.append(str(directory))

    errors = []
    for name in read_pins(PYTHON_DIR / "requirements.txt"):
        try:
            module = importlib.import_module(name.replace("-", "_"))
            print(f"ok  {name:18} {module.__file__}")
        except Exception as e:
            errors.append(f"import {name}: {type(e).__name__}: {e}")

    try:
        import psutil
        psutil.Process().name()
        if arch_dir.is_dir() and not Path(psutil.__file__).is_relative_to(arch_dir):
            errors.append(f"psutil was loaded from {psutil.__file__}, expected {arch_dir}")
    except Exception as e:
        errors.append(f"psutil: {type(e).__name__}: {e}")
    return errors


def main() -> int:
    errors = smoke() if "--smoke" in sys.argv[1:] else check_sync()
    for error in errors:
        print(f"error: {error}", file=sys.stderr)
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
