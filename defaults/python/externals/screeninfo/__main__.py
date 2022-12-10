import argparse

from screeninfo.common import Enumerator

from .screeninfo import get_monitors


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "enumerator", nargs="?", choices=[item.value for item in Enumerator]
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    for monitor in get_monitors(args.enumerator):
        print(str(monitor))


if __name__ == "__main__":
    main()
