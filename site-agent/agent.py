import os
import sys
import time
import json
import logging
from datetime import datetime, timezone
from typing import List, Dict
import requests

from scanner import NetworkScanner, guess_device_type, lookup_vendor
from snmp_poller import SnmpPoller
from buffer import LocalBuffer

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("agent.log", encoding="utf-8")
    ]
)
logger = logging.getLogger("SiteAgent")

def get_base_dir() -> str:
    """Get executable or script base directory"""
    if getattr(sys, 'frozen', False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.abspath(__file__))

def load_config() -> dict:
    config_path = os.path.join(get_base_dir(), "agent_config.json")
    if not os.path.exists(config_path):
        logger.error(f"Configuration file not found: {config_path}")
        return {
            "site_code": "NM_BINH_DUONG",
            "server_url": "http://localhost:8000/api/v1/telemetry/ingest",
            "api_token": "sabibeco-noc-secret-token-2026",
            "auto_scan_enabled": True,
            "scan_subnets": ["192.168.40.0/24"],
            "custom_ping_ips": [],
            "scan_interval_seconds": 30,
            "snmp": {"enabled": True, "community": "public", "timeout": 1.5, "retries": 1}
        }
    with open(config_path, "r", encoding="utf-8") as f:
        return json.load(f)

class SiteAgent:
    def __init__(self):
        self.config = load_config()
        self.site_code = self.config.get("site_code", "UNKNOWN_SITE")
        self.server_url = self.config.get("server_url")
        self.api_token = self.config.get("api_token")
        self.auto_scan_enabled = self.config.get("auto_scan_enabled", True)
        self.scan_subnets = self.config.get("scan_subnets", [])
        self.custom_ping_ips = self.config.get("custom_ping_ips", [])
        self.interval = self.config.get("scan_interval_seconds", 30)

        self.scanner = NetworkScanner()
        snmp_cfg = self.config.get("snmp", {})
        self.snmp_poller = SnmpPoller(
            community=snmp_cfg.get("community", "public"),
            timeout=snmp_cfg.get("timeout", 1.5),
            retries=snmp_cfg.get("retries", 1)
        )
        self.buffer = LocalBuffer(os.path.join(get_base_dir(), "agent_buffer.db"))

    def send_to_server(self, payload: dict) -> bool:
        """Send telemetry to Central Server"""
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_token}"
        }
        try:
            resp = requests.post(self.server_url, json=payload, headers=headers, timeout=10)
            if resp.status_code == 200:
                logger.info(f"Telemetry sent successfully to {self.server_url}")
                return True
            else:
                logger.warning(f"Server responded with status {resp.status_code}: {resp.text}")
                return False
        except Exception as e:
            logger.error(f"Failed to communicate with Central Server: {e}")
            return False

    def fetch_server_custom_ips(self) -> List[str]:
        """Fetch list of user-added ping IPs from server for this site"""
        try:
            base_server = self.server_url.split("/api/v1/")[0]
            resp = requests.get(f"{base_server}/api/v1/devices/?site_code={self.site_code}", timeout=3)
            if resp.status_code == 200:
                devs = resp.json()
                return [d["ip"] for d in devs if "ip" in d]
        except Exception:
            pass
        return []

    def flush_buffer(self):
        """Re-send any payloads accumulated while offline"""
        cached_items = self.buffer.peek_batch(limit=10)
        if not cached_items:
            return

        logger.info(f"Attempting to flush {len(cached_items)} buffered payloads...")
        synced_ids = []
        for item_id, payload in cached_items:
            if self.send_to_server(payload):
                synced_ids.append(item_id)
            else:
                break
        self.buffer.remove_ids(synced_ids)

    def run_cycle(self):
        """Execute one complete discovery & telemetry cycle for both Auto Scan & Manual Add Ping"""
        logger.info(f"--- Starting Scan Cycle for Site: {self.site_code} ---")
        t_start = time.perf_counter()

        discovered_devices: List[Dict] = []
        found_ips = set()

        # 1. OPTION 1: Automated Subnet Sweep (Auto Ping & ARP Scan)
        if self.auto_scan_enabled and self.scan_subnets:
            for subnet in self.scan_subnets:
                subnet_devs = self.scanner.scan_subnet(subnet)
                for dev in subnet_devs:
                    dev["source"] = "auto_scan"
                    found_ips.add(dev["ip"])
                    discovered_devices.append(dev)

        # 2. OPTION 2: Custom Added Ping IPs (from config + Central Server)
        all_manual_ips = set(self.custom_ping_ips)
        server_ips = self.fetch_server_custom_ips()
        all_manual_ips.update(server_ips)

        for manual_ip in all_manual_ips:
            if manual_ip in found_ips:
                continue # Already scanned in auto sweep

            # Ping the manual IP directly
            scan_res = self.scanner.scan_single_ip(manual_ip)
            if scan_res:
                scan_res["source"] = "manual_ping"
                # Check latency >= 100ms for slow classification
                if scan_res.get("response_time_ms", 0) >= 100.0:
                    scan_res["status"] = "slow"
                discovered_devices.append(scan_res)
            else:
                # Device is not responding -> record as offline
                discovered_devices.append({
                    "ip": manual_ip,
                    "mac": None,
                    "hostname": f"Host-{manual_ip}",
                    "vendor": "Custom Ping",
                    "status": "offline",
                    "response_time_ms": 0.0,
                    "device_type": "workstation",
                    "source": "manual_ping"
                })
            found_ips.add(manual_ip)

        # 3. Query SNMP for all responding devices
        for dev in discovered_devices:
            if dev.get("status") in ["online", "slow"]:
                snmp_res = self.snmp_poller.query_device(dev["ip"])
                dev["snmp_status"] = snmp_res.get("snmp_status", "disabled")
                dev["snmp_data"] = snmp_res.get("snmp_data")

                if dev.get("snmp_data") and dev["snmp_data"].get("sys_descr"):
                    dev["device_type"] = guess_device_type(
                        dev.get("hostname"), dev.get("vendor", ""), dev["snmp_data"]["sys_descr"]
                    )
            else:
                dev["snmp_status"] = "disabled"
                dev["snmp_data"] = None

        scan_duration_ms = round((time.perf_counter() - t_start) * 1000, 2)

        payload = {
            "site_code": self.site_code,
            "agent_version": "1.1.0",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "agent_metrics": {
                "scan_duration_ms": scan_duration_ms,
                "auto_scan_count": len([d for d in discovered_devices if d.get("source") == "auto_scan"]),
                "manual_ping_count": len([d for d in discovered_devices if d.get("source") == "manual_ping"])
            },
            "devices": discovered_devices
        }

        # Flush buffer then send payload
        self.flush_buffer()
        success = self.send_to_server(payload)
        if not success:
            logger.warning("Enqueuing payload into local buffer for later retry.")
            self.buffer.enqueue(payload)

        logger.info(f"Cycle completed in {scan_duration_ms}ms. Monitored {len(discovered_devices)} devices (Auto + Manual Ping).")

    def start(self):
        logger.info(f"Site Agent starting for {self.site_code}. Interval: {self.interval}s.")
        while True:
            try:
                self.run_cycle()
            except Exception as e:
                logger.error(f"Unexpected error in agent loop: {e}", exc_info=True)
            
            logger.info(f"Sleeping for {self.interval}s until next scan...")
            time.sleep(self.interval)

if __name__ == "__main__":
    agent = SiteAgent()
    agent.start()
