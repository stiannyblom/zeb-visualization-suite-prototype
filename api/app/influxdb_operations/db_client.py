import warnings

from influxdb_client import InfluxDBClient
from influxdb_client.client.warnings import MissingPivotFunction

from app.config import Config

warnings.simplefilter("ignore", MissingPivotFunction)


def create_influxdb_client():
    return InfluxDBClient(
        url=Config.INFLUXDB_URL,
        token=Config.INFLUXDB_TOKEN,
        org=Config.INFLUXDB_ORG,
        verify_ssl=False,
    )


def get_time_parameters(resolution, year):
    default_stop = f"{year+1}-01-01T01:00:00Z"

    resolution_map = {
        "hourly": ("1h", default_stop),
        "daily": ("1d", default_stop),
        "weekly": ("1w", f"{year+1}-01-07"),  # TODO: Check edge cases
        "monthly": ("1mo", default_stop),
        "yearly": ("1y", default_stop),
    }

    start = f"{year}-01-01"
    every, stop = resolution_map[resolution]

    return start, stop, every


def query_measured_data(client, year, resolution, bucket, measurement, unit, fields):
    query_api = client.query_api()

    fields_filter = " or ".join([f'r["_field"] == "{field}"' for field in fields])
    start, stop, every = get_time_parameters(resolution, year)

    query = (
        f'from(bucket: "{bucket}")'
        f"|> range(start: {start}, stop: {stop})"
        f'|> filter(fn: (r) => r["_measurement"] == "{measurement}")'
        f"|> filter(fn: (r) => {fields_filter})"
        f'|> filter(fn: (r) => r["Units"] == "{unit}")'
        f'|> aggregateWindow(every: {every}, fn: first, createEmpty: false, timeSrc: "_start")'
    )

    return query_api.query_data_frame(query)


def query_modeled_data(client, year, resolution, bucket, measurement, unit, fields, models):
    query_api = client.query_api()

    fields_filter = " or ".join([f'r["_field"] == "{field}"' for field in fields])
    models_filter = " or ".join([f'r["Model"] == "{model}"' for model in models])
    start, stop, every = get_time_parameters(resolution, year)

    query = (
        f'from(bucket: "{bucket}")'
        f"|> range(start: {start}, stop: {stop})"
        f'|> filter(fn: (r) => r["_measurement"] == "{measurement}")'
        f"|> filter(fn: (r) => {fields_filter})"
        f"|> filter(fn: (r) => {models_filter})"
        f'|> filter(fn: (r) => r["Units"] == "{unit}")'
        f'|> aggregateWindow(every: {every}, fn: first, createEmpty: false, timeSrc: "_start")'
    )

    return query_api.query_data_frame(query)


def query_measurements(client, every, bucket, measurements, unit):
    query_api = client.query_api()
    measurements_filter = " or ".join([f'r["_measurement"] == "{measurement}"' for measurement in measurements])
    query = (
        f'from(bucket: "{bucket}")'
        f"|> range(start: 2022-01-01, stop: 2100-01-01)"
        f"|> filter(fn: (r) => {measurements_filter})"
        f'|> filter(fn: (r) => r["Units"] == "{unit}")'
        f'|> aggregateWindow(every: {every}, fn: first, createEmpty: false, timeSrc: "_start")'
    )

    return query_api.query_data_frame(query)
