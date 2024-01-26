#!/usr/bin/env python3
"""
Small module for use with the wake on lan protocol.

"""
import argparse
import ipaddress
import socket
from typing import List
from typing import Optional


BROADCAST_IP = "255.255.255.255"
DEFAULT_PORT = 9


def create_magic_packet(macaddress: str) -> bytes:
    """
    Create a magic packet.

    A magic packet is a packet that can be used with the for wake on lan
    protocol to wake up a computer. The packet is constructed from the
    mac address given as a parameter.

    Args:
        macaddress: the mac address that should be parsed into a magic packet.

    """
    if len(macaddress) == 17:
        sep = macaddress[2]
        macaddress = macaddress.replace(sep, "")
    elif len(macaddress) == 14:
        sep = macaddress[4]
        macaddress = macaddress.replace(sep, "")
    if len(macaddress) != 12:
        raise ValueError("Incorrect MAC address format")
    return bytes.fromhex("F" * 12 + macaddress * 16)


def send_magic_packet(
    *macs: str,
    ip_address: str = BROADCAST_IP,
    port: int = DEFAULT_PORT,
    interface: Optional[str] = None,
    address_family: Optional[socket.AddressFamily] = None
) -> None:
    """
    Wake up computers having any of the given mac addresses.

    Wake on lan must be enabled on the host device.

    Args:
        macs: One or more macaddresses of machines to wake.

    Keyword Args:
        ip_address: the ip address of the host to send the magic packet to.
        port: the port of the host to send the magic packet to.
        interface: the ip address of the network adapter to route the magic packet through.
        address_family: the address family of the ip address to initiate connection with.
            When not specificied, chosen automatically between IPv4 and IPv6.

    """
    packets = [create_magic_packet(mac) for mac in macs]

    if address_family is None:
        address_family = (
            socket.AF_INET6 if _is_ipv6_address(ip_address) else socket.AF_INET
        )

    with socket.socket(address_family, socket.SOCK_DGRAM) as sock:
        if interface is not None:
            sock.bind((interface, 0))
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
        sock.connect((ip_address, port))
        for packet in packets:
            sock.send(packet)


def _is_ipv6_address(ip_address: str) -> bool:
    try:
        return isinstance(ipaddress.ip_address(ip_address), ipaddress.IPv6Address)
    except ValueError:
        return False


def main(argv: Optional[List[str]] = None) -> None:
    """
    Run wake on lan as a CLI application.

    """
    parser = argparse.ArgumentParser(
        description="Wake one or more computers using the wake on lan protocol.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument(
        "macs",
        metavar="mac address",
        nargs="+",
        help="The mac addresses of the computers you are trying to wake.",
    )
    parser.add_argument(
        "-6",
        dest="use_ipv6",
        action="store_true",
        help="To indicate if ipv6 should be used by default instead of ipv4.",
    )
    parser.add_argument(
        "-i",
        metavar="ip",
        default=BROADCAST_IP,
        help="The ip address of the host to send the magic packet to.",
    )
    parser.add_argument(
        "-p",
        metavar="port",
        type=int,
        default=DEFAULT_PORT,
        help="The port of the host to send the magic packet to.",
    )
    parser.add_argument(
        "-n",
        metavar="interface",
        default=None,
        help="The ip address of the network adapter to route the magic packet through.",
    )
    args = parser.parse_args(argv)
    send_magic_packet(
        *args.macs,
        ip_address=args.i,
        port=args.p,
        interface=args.n,
        address_family=socket.AF_INET6 if args.use_ipv6 else None
    )


if __name__ == "__main__":  # pragma: nocover
    main()
