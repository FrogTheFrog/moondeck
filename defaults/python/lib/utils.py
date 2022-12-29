import copy
import inspect

from enum import Enum
from typing import Any, Dict, Literal, Type, TypeVar, get_args, get_origin


T = TypeVar("T")
def from_dict(output_type: Type[T], data: Dict[str, Any]) -> T:
    def is_typed_dict(data_type):
        return hasattr(data_type, "__annotations__")

    def is_dict_like(data):
        return is_typed_dict(data) or isinstance(data, dict)
    
    def is_enum_like(data_type):
        return inspect.isclass(data_type) and issubclass(data_type, Enum)

    def is_literal_like(data_type):
        return get_origin(data_type) == Literal

    def get_annotations(data_type, data):
        if is_typed_dict(data_type):
            for key, key_type in data_type.__annotations__.items():
                yield (key, key_type)
        else:
            for key in data.keys():
                yield (key, data_type[1])

    verified_data = {}
    for key, key_type in get_annotations(output_type, data):
        if key not in data:
            raise ValueError(f"Key \"{key}\" is not available in {data}.")

        actual_type = get_args(key_type) or key_type
        if is_dict_like(data[key]):
            verified_data[key] = from_dict(actual_type, data[key])
            continue
        elif is_literal_like(key_type):
            if data[key] not in actual_type:
                raise TypeError(f"Value {data[key]} of \"{key}\" does not match the valid literal value(-s) {actual_type}")
        elif is_enum_like(actual_type):
            verified_data[key] = actual_type[data[key]]
            continue
        elif not isinstance(data[key], actual_type):
            raise TypeError(f"\"{key}\" value {data[key]} is not of valid type(-s) {actual_type}")

        verified_data[key] = copy.deepcopy(data[key])

    return output_type(**verified_data) if is_typed_dict(output_type) else verified_data
