import copy
import inspect

from enum import Enum
from functools import wraps
from typing import Any, Dict, List, Literal, Type, Union, TypeVar, get_args, get_origin, is_typeddict


T = TypeVar("T")


def is_typed_dict(data_type):
    return is_typeddict(data_type)


def is_optional_like(data_type):
    args = get_args(data_type)
    return get_origin(data_type) == Union and len(args) == 2 and args[1] == type(None)


def is_dict_like(data_type):
    return is_typed_dict(data_type) or get_origin(data_type) == dict


def is_list_like(data_type):
    return get_origin(data_type) == list

    
def is_enum_like(data_type):
    return inspect.isclass(data_type) and issubclass(data_type, Enum)


def is_literal_like(data_type):
    return get_origin(data_type) == Literal


def from_list(item_type: Type[T], data: List[Any]) -> List[T]:
    assert isinstance(data, list), f"Expected list (\"{item_type}\"), got {data}"

    verified_data = []
    for item in data:
        if is_list_like(item_type):
            actual_type = get_args(item_type)
            verified_item = from_list(actual_type[0], item)
        elif is_dict_like(item_type):
            verified_item = from_dict(item_type, item)
        else:
            assert isinstance(item, item_type)
            verified_item = item
            
        verified_data.append(verified_item)
    return verified_data


def from_dict(output_type: Type[T], data: Dict[str, Any]) -> T:
    assert isinstance(data, dict), f"Expected dict (\"{output_type}\"), got {data}"
    
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

        if is_optional_like(key_type):
            if data[key] is None:
                verified_data[key] = None
                continue
            else:
                key_type = get_args(key_type)[0]

        actual_type = get_args(key_type) or key_type
        if is_enum_like(actual_type):
            verified_data[key] = actual_type[data[key]]
            continue
        elif is_dict_like(key_type):
            verified_data[key] = from_dict(actual_type, data[key])
            continue
        elif is_list_like(key_type):
            verified_data[key] = from_list(actual_type[0], data[key])
            continue
        elif is_literal_like(key_type):
            if data[key] not in actual_type:
                raise TypeError(f"Value {data[key]} of \"{key}\" does not match the valid literal value(-s) {actual_type}")
        elif not isinstance(data[key], actual_type):
            raise TypeError(f"\"{key}\" value {data[key]} is not of valid type(-s) {actual_type}")

        verified_data[key] = copy.deepcopy(data[key])

    return output_type(**verified_data) if is_typed_dict(output_type) else verified_data

# Decorator for loging the entry/exit and the result
def async_scope_log(log_fn):
    def decorator(func):
        @wraps(func)
        async def impl(*args, **kwargs):
            args_str = "" if len(args) == 0 else f"args={args}"
            kwargs_str = "" if len(kwargs) == 0 else f"kwargs={kwargs}"
            sep_str = ", " if args_str and kwargs_str else ""
            
            log_fn(f"-> {func.__name__}({args_str}{sep_str}{kwargs_str})")
            result = await func(*args, **kwargs)
            log_fn(f"<- {func.__name__}(...): {result}")
            return result
        return impl
    return decorator
