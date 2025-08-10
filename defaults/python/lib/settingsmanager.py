from abc import ABCMeta, abstractmethod
from typing import Any, Generic, Optional, get_args

from .utils import TD, from_dict, AnyTypedDict


class SettingsManager(Generic[TD], metaclass=ABCMeta):
    def __init__(self, filepath):
        # Lazy import to improve CLI performance
        from pathlib import Path

        self.settings_type = get_args(self.__orig_bases__[0])[0]  # type: ignore
        self.filepath: Path = Path(filepath)

    async def read(self):
        # Lazy import to improve CLI performance
        import copy
        import json

        settings: Optional[TD] = None
        migrated = False
        try:
            with open(self.filepath, "r") as file:
                data: AnyTypedDict = json.load(file)
                try:
                    settings = from_dict(self.settings_type, data)
                except Exception as err:
                    if not settings:
                        initial_data = copy.deepcopy(data)

                        self._migrate_settings(data)
                        migrated_data = from_dict(self.settings_type, data)
                        if initial_data == migrated_data:
                            raise Exception(
                                f"Settings migration for {self.settings_type} was not performed! Initial data: {initial_data}")
                        else:
                            settings = migrated_data
                            migrated = True
                    else:
                        raise err

        except FileNotFoundError:
            pass

        return settings, migrated

    async def read_or_update(self):
        settings, migrated = await self.read()
        if settings is None:
            settings = self._default_settings()
            await self.write(settings)
        elif migrated:
            await self.write(settings)

        return settings

    async def write(self, settings: TD):
        # Lazy import to improve CLI performance
        import json

        # Verify that settings we are about to save are valid
        settings = from_dict(self.settings_type, settings)
        self.filepath.parent.mkdir(parents=True, exist_ok=True)
        with open(self.filepath, "w") as file:
            json.dump(settings, file,
                      ensure_ascii=False, allow_nan=False,
                      indent=4)

    @abstractmethod
    def _default_settings(self) -> TD:
        pass

    @abstractmethod
    def _migrate_settings(self, data: Any):
        pass
