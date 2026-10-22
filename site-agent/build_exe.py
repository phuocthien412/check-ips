import os
import subprocess
import sys

def build():
    print("=== Building Site Agent Windows Executable ===")
    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--noconfirm",
        "--onefile",
        "--console", # change to --noconsole if purely hidden, but console helps logging when run manually
        "--name", "site_agent",
        "--clean",
        "agent.py"
    ]
    print("Running command:", " ".join(cmd))
    res = subprocess.run(cmd)
    if res.returncode == 0:
        print("\n[SUCCESS] Build complete! Executable is at: dist/site_agent.exe")
        print("Copy dist/site_agent.exe and agent_config.json to your target factory server.")
    else:
        print(f"\n[ERROR] Build failed with exit code: {res.returncode}")

if __name__ == "__main__":
    build()
