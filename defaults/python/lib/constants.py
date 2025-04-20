import pathlib
import typing


BUDDY_API_VERSION = 6
CONFIG_VERSION_LITERAL = typing.Literal[32]
CONFIG_DIR = str(pathlib.Path.home() / ".config" / "moondeck")
CONFIG_FILENAME = "settings.json"
LOG_FILE = "/tmp/moondeck.log"
RUNNER_LOG_FILE = "/tmp/moondeck-runner.log"
MOONLIGHT_LOG_FILE = "/tmp/moondeck-runner-moonlight.log"
RUNNER_RESULT_FILE = "/tmp/moondeck-runner.result"
RUNNER_READY_FILE = "/tmp/moondeck-runner-ready"
