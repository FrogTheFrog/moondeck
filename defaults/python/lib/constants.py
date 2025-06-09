import pathlib


BUDDY_API_VERSION = 7
CONFIG_FILE = pathlib.Path.home() / ".config" / "moondeck" / "settings.json"
LOG_FILE = "/tmp/moondeck.log"
RUNNER_LOG_FILE = "/tmp/moondeck-runner.log"
MOONLIGHT_LOG_FILE = "/tmp/moondeck-runner-moonlight.log"
RUNNER_RESULT_FILE = "/tmp/moondeck-runner.result"
RUNNER_READY_FILE = "/tmp/moondeck-runner-ready"
