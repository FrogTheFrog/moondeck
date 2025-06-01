import inspect
import functools


def cmd_entry(f):
    """
    Make function ignore unmatched kwargs.
    If the function already has the catch all **kwargs, do nothing.

    https://stackoverflow.com/a/63787701
    and
    https://stackoverflow.com/a/42769789
    """
    def contains_var_kwarg(f):
        return any(
            param.kind == inspect.Parameter.VAR_KEYWORD
            for param in inspect.signature(f).parameters.values()
        )

    if contains_var_kwarg(f):
        return f

    def is_kwarg_of(key, f):
        param = inspect.signature(f).parameters.get(key, None)
        return param and (
            param.kind is inspect.Parameter.KEYWORD_ONLY or
            param.kind is inspect.Parameter.POSITIONAL_OR_KEYWORD
        )

    def filter_kwargs(**kwargs):
        return {
            key: value
            for key, value in kwargs.items()
            if is_kwarg_of(key, f)
        }

    @functools.wraps(f)
    async def async_wrapper(*args, **kwargs):
        return await f(*args, **filter_kwargs(**kwargs))

    return async_wrapper
