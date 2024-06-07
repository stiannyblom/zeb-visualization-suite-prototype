import os

from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class Config:
    INFLUXDB_URL = os.getenv("INFLUXDB_URL", "")
    INFLUXDB_ORG = os.getenv("INFLUXDB_ORG", "")
    INFLUXDB_TOKEN = os.getenv("INFLUXDB_TOKEN", "")
    INFLUXDB_DEFAULT_BUCKET = os.getenv("INFLUXDB_BUCKET", "zeb_modell")
