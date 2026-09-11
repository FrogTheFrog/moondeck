"""Exercise cleanup against a live child and a child that already exited."""
import ast
from pathlib import Path
import subprocess
import sys
from typing import cast

import psutil

source = ast.parse(Path('defaults/python/lib/utils.py').read_text())
function = next(n for n in source.body if isinstance(n, ast.FunctionDef) and n.name == 'ps_signal')
namespace = {'cast': cast}
exec(compile(ast.fix_missing_locations(ast.Module(body=[function], type_ignores=[])), '<ps_signal>', 'exec'), namespace)

for kill in (False, True):
    child = subprocess.Popen([sys.executable, '-c', 'import time; time.sleep(30)'])
    process = psutil.Process(child.pid)
    try:
        namespace['ps_signal'](process, kill)
        child.wait(timeout=5)
        # The exact PR live test hit this race: Moonlight had exited before cleanup.
        namespace['ps_signal'](process, kill)
    finally:
        if child.poll() is None:
            child.kill()
            child.wait(timeout=5)

print('PASS: terminate/kill a child and repeat cleanup after it has been reaped')
