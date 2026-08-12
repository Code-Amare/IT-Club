import subprocess
import sys
from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parent

CERT_FILE = os.path.abspath(
    os.path.join(BASE_DIR, "..", "certs", "cert.pem")
)

KEY_FILE = os.path.abspath(
    os.path.join(BASE_DIR, "..", "certs", "key.pem")
)



def run_server():
    # Ensure uvicorn is installed
    try:
        import uvicorn  # noqa: F401
    except ImportError:
        print("Uvicorn is not installed. Installing it now...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "uvicorn"])

    cmd = [
        sys.executable,
        "-m",
        "uvicorn",
        "core.asgi:application",
        "--host",
        "0.0.0.0",
        "--port",
        "8000",
        "--reload",
        "--ssl-certfile",
        str(CERT_FILE),
        "--ssl-keyfile",
        str(KEY_FILE),
    ]

    print("Starting Django + Channels server with Uvicorn (HTTPS)...")
    subprocess.run(cmd)


if __name__ == "__main__":
    run_server()
