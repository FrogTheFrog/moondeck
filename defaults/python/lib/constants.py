BUDDY_API_VERSION = 8
LOG_FILE = "/tmp/moondeck.log"
FRONTEND_LOG_FILE = "/tmp/moondeck-frontend.log"
RUNNER_LOG_FILE = "/tmp/moondeck-runner.log"
MOONLIGHT_LOG_FILE = "/tmp/moondeck-runner-moonlight.log"
RUNNER_RESULT_FILE = "/tmp/moondeck-runner.result"
RUNNER_READY_FILE = "/tmp/moondeck-runner-ready"
RUNNER_SUSPENDED_FILE = "/tmp/moondeck-runner-suspended"
RUNNER_PID_FILE = "/tmp/moondeck-runner-pid"
RUNNER_SUSPEND_CANCEL_MSG = "suspended"

def get_config_file_path():
    # Lazy import to improve CLI performance
    import pathlib

    return pathlib.Path.home() / ".config" / "moondeck" / "settings.json"
