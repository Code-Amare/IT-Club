import time
import environ
import cloudinary
import cloudinary.utils
from pathlib import Path

env = environ.Env()
BASE_DIR = Path(__file__).resolve().parent
environ.Env.read_env(str(BASE_DIR / ".env"))

cloudinary.config(
    cloud_name=env("CLOUD_NAME"),
    api_key=env("API_KEY"),
    api_secret=env("API_SECRET"),
    secure=True,
)


def get_signed_url(public_id, expires_in=30):
    url, _ = cloudinary.utils.cloudinary_url(
        public_id,
        resource_type="image",
        type="authenticated",
        sign_url=True,
        secure=True,
        expires_at=int(time.time()) + expires_in,
    )
    return url


print(get_signed_url("users/profiles/geaxmztnadovmhjadgti"))
