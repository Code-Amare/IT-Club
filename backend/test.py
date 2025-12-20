import time
import environ
import cloudinary
import cloudinary.utils
from pathlib import Path

# 1. Initialize environment and find the .env file
env = environ.Env()
BASE_DIR = Path(__file__).resolve().parent
environ.Env.read_env(str(BASE_DIR / ".env"))

# 2. Configure Cloudinary using variables from .env
cloudinary.config(
    cloud_name=env("CLOUD_NAME"),
    api_key=env("API_KEY"),
    api_secret=env("API_SECRET"),
    secure=True,
)


def get_signed_url(public_id, expires_in=30):
    # Using the 'private_download_url' method with the 'format' argument
    url = cloudinary.utils.private_download_url(
        public_id,
        "png",  # Required positional argument
        params={
            "resource_type": "image",
            "type": "authenticated",
            "expires_at": int(time.time()) + expires_in,
        },
    )
    print(f"\nDEBUG: Generated Expiring URL:\n{url}\n")
    return url


# Run the test
# get_signed_url("users/profiles/wosxxxawpn1vehbdhdkv")
# Temporary debug line to see if the file exists as a public resource
debug_url, _ = cloudinary.utils.cloudinary_url("users/profiles/uyrdkye0twtvzav6otez")
print(f"CHECK THIS MANUALLY: {debug_url}")
