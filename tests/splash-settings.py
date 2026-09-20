import asyncio
import json
from pathlib import Path
import sys
import tempfile

sys.path.insert(0, str(Path('defaults/python').resolve()))
sys.path.insert(0, str(Path('defaults/python/externals').resolve()))
from lib.plugin.settings import UserSettingsManager

async def main():
    with tempfile.TemporaryDirectory() as directory:
        manager = UserSettingsManager(Path(directory) / 'settings.json')
        initial = manager._default_settings()
        assert initial['pauseUnfocusedSplash'] is False
        initial['version'] = 42
        del initial['pauseUnfocusedSplash']
        initial['gameSession']['resumeAfterSuspend'] = True
        manager.filepath.write_text(json.dumps(initial))
        migrated = await manager.read_or_update()
        assert migrated['version'] == 43
        assert migrated['pauseUnfocusedSplash'] is False
        assert migrated['gameSession']['resumeAfterSuspend'] is True
        assert migrated['clientId'] == initial['clientId']
        migrated['pauseUnfocusedSplash'] = True
        await manager.write(migrated)
        assert (await manager.read_or_update())['pauseUnfocusedSplash'] is True
        print('PASS: default off, migration preserves preferences/identity, enabled setting persists')

asyncio.run(main())
