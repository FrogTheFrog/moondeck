import ast
import asyncio
from enum import Enum
from pathlib import Path

class AppState(Enum):
    Stopped = 0
    Running = 1

class Logger:
    def exception(self, *args): pass

source = ast.parse(Path('main.py').read_text())
method = next(n for cls in source.body if isinstance(cls, ast.ClassDef) for n in cls.body if isinstance(n, ast.AsyncFunctionDef) and n.name == 'stop_steam_app')
method.decorator_list = []
namespace = {'asyncio': asyncio, 'AppState': AppState, 'logger': Logger()}
exec(compile(ast.fix_missing_locations(ast.Module(body=[method], type_ignores=[])), '<stop_steam_app>', 'exec'), namespace)

async def check(states, accepted=True, expected=False):
    class Requests:
        def __init__(self, *args): self.states = iter(states)
        async def __aenter__(self): return self
        async def __aexit__(self, *args): pass
        async def post_stop_steam_app(self, app_id): return {'result': accepted}
        async def get_app_data(self, app_id):
            assert app_id == '123'
            return {'data': next(self.states)}
    namespace['BuddyRequests'] = Requests
    assert await namespace['stop_steam_app'](None, 'host', 59999, 'client', '123') is expected

async def main():
    await check([None])  # Clearing a streaming session is not proof of game exit.
    await check([{'app_id':'999','app_state':AppState.Stopped}])
    await check([], accepted=False)
    await check([None, {'app_id':'123','app_state':AppState.Running}, {'app_id':'123','app_state':AppState.Stopped}], expected=True)
    print('PASS: host refusal, absent state, wrong app, and confirmed game exit')

asyncio.run(main())
