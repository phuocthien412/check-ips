import sys
import time
import socket
import struct
import ctypes
import ipaddress
import concurrent.futures
from typing import List, Dict, Optional, Tuple

# Common Enterprise & Industrial Network Vendor OUI Database
OUI_DATABASE = {
    # Cisco Systems
    "00:00:0C": "Cisco", "00:01:42": "Cisco", "00:01:43": "Cisco", "00:01:63": "Cisco",
    "00:01:64": "Cisco", "00:01:96": "Cisco", "00:01:97": "Cisco", "00:02:16": "Cisco",
    "00:02:17": "Cisco", "00:02:4A": "Cisco", "00:02:4B": "Cisco", "00:02:7D": "Cisco",
    "00:1E:13": "Cisco", "00:24:14": "Cisco", "00:26:0B": "Cisco", "70:81:05": "Cisco",
    "F4:4E:05": "Cisco", "00:25:84": "Cisco", "50:06:04": "Cisco", "64:9E:F3": "Cisco",

    # Ruijie / Reyee
    "00:1A:A9": "Ruijie Networks", "58:69:6C": "Ruijie Networks", "34:CE:00": "Ruijie Networks",
    "70:2E:22": "Ruijie Networks", "B0:08:75": "Ruijie Networks", "94:87:60": "Ruijie Networks",

    # Aruba / HPE
    "00:0B:86": "Aruba / HPE", "00:1A:1E": "Aruba / HPE", "00:24:81": "Aruba / HPE",
    "24:BE:05": "Aruba / HPE", "3C:D9:2B": "Aruba / HPE", "94:57:A5": "Aruba / HPE",
    "00:14:38": "HP", "00:1F:29": "HP", "B4:99:BA": "HP", "D4:C9:EF": "HP",

    # Mikrotik
    "00:0C:42": "MikroTik", "48:8F:5A": "MikroTik", "64:D1:54": "MikroTik",
    "74:4D:28": "MikroTik", "CC:2D:E0": "MikroTik", "D4:CA:6D": "MikroTik", "E4:8D:8C": "MikroTik",

    # Ubiquiti
    "00:15:6D": "Ubiquiti", "00:27:22": "Ubiquiti", "24:A4:3C": "Ubiquiti",
    "68:D7:9A": "Ubiquiti", "74:83:C2": "Ubiquiti", "78:8A:20": "Ubiquiti",
    "80:2A:A8": "Ubiquiti", "B4:FB:E4": "Ubiquiti", "DC:9F:DB": "Ubiquiti", "F0:9F:C2": "Ubiquiti",

    # Surveillance / Cameras (Hikvision, Dahua, Uniview)
    "18:68:CB": "Hikvision", "44:19:B6": "Hikvision", "4C:BD:8F": "Hikvision",
    "BC:5E:2B": "Hikvision", "C4:2F:90": "Hikvision", "D8:96:85": "Hikvision", "E0:50:8B": "Hikvision",
    "38:AF:29": "Dahua", "48:D0:C5": "Dahua", "90:02:A9": "Dahua", "A0:BD:1D": "Dahua", "B8:A3:86": "Dahua",

    # Storage & Servers (Synology, QNAP, Dell, Lenovo)
    "00:11:32": "Synology", "00:08:9B": "QNAP",
    "00:14:22": "Dell", "00:16:35": "Dell", "00:18:8B": "Dell", "18:03:73": "Dell",
    "24:B6:FD": "Dell", "74:86:7A": "Dell", "B8:AC:6F": "Dell",

    # DrayTek & TP-Link
    "00:1D:AA": "DrayTek", "00:50:7F": "DrayTek",
    "00:27:19": "TP-Link", "14:CF:92": "TP-Link", "50:C7:BF": "TP-Link",
    "70:4F:57": "TP-Link", "E8:48:B8": "TP-Link", "B0:4E:26": "TP-Link",

    # Huawei
    "00:18:82": "Huawei", "00:1E:10": "Huawei", "00:25:9E": "Huawei", "28:6E:D4": "Huawei",

    # Intel & Realtek (PCs / NICs)
    "00:1B:21": "Intel", "00:1E:67": "Intel", "00:21:5C": "Intel", "00:24:D7": "Intel",
    "00:E0:4C": "Realtek", "52:54:00": "QEMU/KVM Virtual NIC"
}

def lookup_vendor(mac_address: Optional[str]) -> str:
    """Resolve device vendor by MAC OUI prefix"""
    if not mac_address:
        return "Unknown"
    normalized = mac_address.upper().replace("-", ":")
    prefix = ":".join(normalized.split(":")[:3])
    return OUI_DATABASE.get(prefix, "Generic Network Device")

def guess_device_type(hostname: Optional[str], vendor: str, snmp_descr: Optional[str] = None) -> str:
    """Classify device into switch, router, ap, server, printer, camera, or workstation"""
    combined = f"{hostname or ''} {vendor or ''} {snmp_descr or ''}".lower()
    
    if any(k in combined for k in ["switch", "c2960", "c3850", "c9200", "c9300", "sw-", "s5700", "edgeswitch"]):
        return "switch"
    if any(k in combined for k in ["router", "mikrotik", "routeros", "draytek", "vigor", "rt-", "gateway"]):
        return "router"
    if any(k in combined for k in ["ap", "access point", "unifi", "airmax", "aruba ap", "wap"]):
        return "access_point"
    if any(k in combined for k in ["hikvision", "dahua", "cam", "camera", "nvr", "dvr"]):
        return "camera"
    if any(k in combined for k in ["synology", "nas", "storage", "qnap", "truenas"]):
        return "storage"
    if any(k in combined for k in ["server", "esxi", "vmware", "proxmox", "hyper-v", "ubuntu", "debian", "windows server"]):
        return "server"
    if any(k in combined for k in ["printer", "hp laserjet", "epson", "canon", "brother"]):
        return "printer"
    
    return "workstation"

class NetworkScanner:
    """
    Zero-Driver Windows ARP & Ping Scanner.
    Calls Windows Native SendARP (iphlpapi.dll) directly without requiring Npcap/WinPcap.
    """
    def __init__(self):
        self.is_windows = sys.platform.startswith("win")
        if self.is_windows:
            try:
                self.iphlpapi = ctypes.windll.iphlpapi
                self.ws2_32 = ctypes.windll.ws2_32
                self._send_arp = self.iphlpapi.SendARP
                self._inet_addr = self.ws2_32.inet_addr
            except Exception as e:
                self.is_windows = False
                print(f"Warning: Failed to load Windows SendARP API: {e}")

    def send_arp_windows(self, ip_str: str) -> Tuple[bool, Optional[str], float]:
        """Send native ARP request via Windows iphlpapi.dll SendARP"""
        dest_ip = self._inet_addr(ip_str.encode('ascii'))
        src_ip = 0
        p_mac = (ctypes.c_ubyte * 6)()
        mac_len = ctypes.c_ulong(6)

        t_start = time.perf_counter()
        ret = self._send_arp(dest_ip, src_ip, ctypes.byref(p_mac), ctypes.byref(mac_len))
        latency_ms = (time.perf_counter() - t_start) * 1000

        if ret == 0: # NO_ERROR
            mac = ":".join(f"{p_mac[i]:02X}" for i in range(6))
            return True, mac, round(latency_ms, 2)
        return False, None, 0.0

    def check_socket_ping(self, ip_str: str, port: int = 80, timeout: float = 0.5) -> bool:
        """Fallback ping/TCP handshake check"""
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(timeout)
            s.connect((ip_str, port))
            s.close()
            return True
        except Exception:
            return False

    def scan_single_ip(self, ip_str: str) -> Optional[Dict]:
        """Scan a single IP address using SendARP first, fallback to TCP/ICMP probe"""
        is_online = False
        mac = None
        latency_ms = 0.0

        if self.is_windows:
            is_online, mac, latency_ms = self.send_arp_windows(ip_str)

        if not is_online:
            # Fallback quick port probes (common management ports: 80, 443, 22, 161)
            for test_port in [80, 443, 22]:
                if self.check_socket_ping(ip_str, port=test_port, timeout=0.3):
                    is_online = True
                    latency_ms = 15.0
                    break

        if not is_online:
            return None

        # Resolve hostname reverse DNS
        hostname = None
        try:
            hostname = socket.gethostbyaddr(ip_str)[0]
        except Exception:
            pass

        vendor = lookup_vendor(mac)
        device_type = guess_device_type(hostname, vendor)

        return {
            "ip": ip_str,
            "mac": mac,
            "hostname": hostname,
            "vendor": vendor,
            "status": "online",
            "response_time_ms": latency_ms,
            "device_type": device_type
        }

    def scan_subnet(self, cidr: str, max_workers: int = 64) -> List[Dict]:
        """Scan an entire CIDR subnet (e.g. 192.168.40.0/24) concurrently"""
        try:
            net = ipaddress.ip_network(cidr, strict=False)
        except Exception as e:
            print(f"Invalid CIDR {cidr}: {e}")
            return []

        hosts = [str(ip) for ip in net.hosts()]
        results = []

        t_start = time.perf_counter()
        with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_ip = {executor.submit(self.scan_single_ip, ip): ip for ip in hosts}
            for future in concurrent.futures.as_completed(future_to_ip):
                res = future.result()
                if res:
                    results.append(res)

        duration = round((time.perf_counter() - t_start), 2)
        print(f"Subnet {cidr} scanned: Found {len(results)} active devices in {duration}s")
        return results
