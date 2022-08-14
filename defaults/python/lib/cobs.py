# ----------------------------------------------------------------------------
# Copyright (c) 2010 Craig McQueen
#
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in
# all copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.
# ----------------------------------------------------------------------------

from typing import Optional
from .logger import logger


def __get_max_posible_size_after_encoding(input_size: int):
    return input_size + int(int(input_size + 253) / 254)


def __get_buffer_view(data: memoryview):
    data = data if isinstance(data, memoryview) else memoryview(data)
    if data.ndim > 1 or data.itemsize > 1:
        raise BufferError(
            "Data must be a single-dimension buffer of bytes!")
    try:
        data = data.cast("c")
    except AttributeError:
        pass
    return data


SEPARATOR = bytes(b"\x00")


def encode(data: bytes | memoryview) -> bytearray:
    data_size = len(data)
    if data_size == 0:
        return bytearray()

    data = __get_buffer_view(data)
    output = bytearray(
        __get_max_posible_size_after_encoding(data_size))

    length_code = 1
    code_index = 0
    output_index = 1
    for data_index in range(data_size):
        data_byte = int.from_bytes(data[data_index], "big")
        if data_byte == 0:
            output[code_index] = length_code
            code_index = output_index
            output_index += 1
            length_code = 1

            if data_index == data_size:
                break
        else:
            output[output_index] = data_byte
            output_index += 1
            length_code += 1

            if data_index == data_size:
                break
            elif length_code == 0xFF:
                output[code_index] = length_code
                code_index = output_index
                output_index += 1
                length_code = 1

    output[code_index] = length_code
    output = output[0:output_index]

    return output


def decode(data: bytes | memoryview) -> Optional[bytearray]:
    data_size = len(data)
    if data_size == 0:
        return bytearray()

    data = __get_buffer_view(data)
    output = bytearray(data_size)

    data_index = 0
    output_index = 0
    while True:
        length_code = int.from_bytes(data[data_index], "big")
        data_index += 1
        if length_code == 0:
            logger.error("0x00 byte in the data array! Bailing...")
            return None
        length_code -= 1

        remaining_bytes = data_size - data_index
        if length_code > remaining_bytes:
            logger.error("Missing data in the data array! Bailing...")
            return None

        for _ in range(length_code, 0, -1):
            data_byte = int.from_bytes(data[data_index], "big")
            data_index += 1
            if data_byte == 0:
                logger.error("0x00 byte in the data array! Bailing...")
                return None
            output[output_index] = data_byte
            output_index += 1

        if data_index == data_size:
            break

        if length_code != 0xFE:
            output[output_index] = 0
            output_index += 1

    output = output[0:output_index]
    return output
