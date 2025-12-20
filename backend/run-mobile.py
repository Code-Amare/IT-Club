import subprocess
import sys
import socket
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
# IMPORTANT: Ensure these files were created for your specific Local IP or use 'mkcert'
CERT_FILE = BASE_DIR / "certs" / "localhost+2.pem"
KEY_FILE = BASE_DIR / "certs" / "localhost+2-key.pem"


def get_local_ip():
    """Automatically finds your computer's IP on the local network."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # This doesn't actually connect to Google, it just uses the path to find our IP
        s.connect(("8.8.8.8", 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = "127.0.0.1"
    finally:
        s.close()
    return IP


def run_server():
    # Ensure uvicorn is installed
    try:
        import uvicorn  # noqa: F401
    except ImportError:
        print("Uvicorn is not installed. Installing it now...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "uvicorn"])

    local_ip = get_local_ip()
    port = "8000"

    cmd = [
        sys.executable,
        "-m",
        "uvicorn",
        "core.asgi:application",
        "--host",
        "192.168.8.11",  # Listen on all network interfaces
        # "0.0.0.0",  # Listen on all network interfaces
        "--port",
        port,
        "--reload",
        "--ssl-certfile",
        str(CERT_FILE),
        "--ssl-keyfile",
        str(KEY_FILE),
    ]

    print("--- Local Network Server Details ---")
    print(f"Server is running locally at: https://localhost:{port}")
    print(f"Other devices can connect at: https://{local_ip}:{port}")
    print(f"WebSocket (WSS) URL: wss://{local_ip}:{port}/ws/your-endpoint/")
    print("-------------------------------------")

    subprocess.run(cmd)


if __name__ == "__main__":
    run_server()
