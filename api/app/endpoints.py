from flask import Blueprint, jsonify, request

from app.config import Config
from app.influxdb_operations.db_client import (
    create_influxdb_client,
    query_measured_data,
    query_measurements,
    query_modeled_data,
)
from app.utils.data_processing import (
    create_final_combined_data_structure,
    create_final_measured_data_structure,
    create_final_modeled_data_structure,
    get_unique_years_from_df,
    get_unique_years_from_df_list,
    process_measured_data,
    process_modeled_data,
)


def _get_valid_resolutions():
    return ["hourly", "daily", "weekly", "monthly", "yearly"]


def _get_valid_years(client, bucket, measurements, unit, every):
    # Execute query. Returns list of dataframes (one for each measurement)
    data = query_measurements(client, every, bucket, measurements, unit)

    if isinstance(data, list):
        return get_unique_years_from_df_list(data)
    return get_unique_years_from_df(data)


api_blueprint = Blueprint("api", __name__)


@api_blueprint.route("/energy-summary-data", methods=["GET"])
def get_energy_summary_data():
    client = create_influxdb_client()  # TODO: Memoize

    bucket = request.args.get("bucket", Config.INFLUXDB_DEFAULT_BUCKET)
    measured_data_measurement = request.args.get("measured_data_measurement")
    modeled_data_measurement = request.args.get("modeled_data_measurement")
    fields = request.args.get("fields").split(",")
    # TODO: Handle case when models is not provided
    models = request.args.get("models").split(",")
    year = int(request.args.get("year"))
    resolution = request.args.get("resolution", "monthly")
    unit = "kilowattHours"

    # Check if resolution is valid
    valid_resolutions = _get_valid_resolutions()
    if resolution not in valid_resolutions:
        return (
            "Invalid resolution. Valid resolutions are: hourly, daily, weekly, monthly, yearly",
            400,
        )

    # Check if year is valid
    valid_years = _get_valid_years(
        client,
        bucket,
        [measured_data_measurement, modeled_data_measurement],
        unit,
        "1mo",
    )
    if year not in valid_years:
        return (
            "No data for this year.",
            404,  # TODO: Consider changing to 204
        )

    measured_data = query_measured_data(client, year, resolution, bucket, measured_data_measurement, unit, fields)
    modeled_data = query_modeled_data(
        client,
        year,
        resolution,
        bucket,
        modeled_data_measurement,
        unit,
        fields,
        models,
    )
    client.close()

    processed_measured_data = process_measured_data(measured_data, fields, resolution)
    processed_modeled_data = process_modeled_data(modeled_data, fields, models, resolution)

    final_structure = create_final_combined_data_structure(
        processed_measured_data,
        processed_modeled_data,
        fields,
        models,
        [measured_data_measurement, modeled_data_measurement],
        unit,
        year,
    )

    response = jsonify(final_structure)
    return response


@api_blueprint.route("/energy-summary-measured-field-data", methods=["GET"])
def get_energy_summary_measured_field_data():
    client = create_influxdb_client()  # TODO: Memoize

    bucket = request.args.get("bucket", Config.INFLUXDB_DEFAULT_BUCKET)
    measurement = request.args.get("measurement")
    fields = request.args.get("fields").split(",")
    year = int(request.args.get("year"))
    resolution = request.args.get("resolution", "monthly")
    unit = "kilowattHours"

    # Check if resolution is valid
    valid_resolutions = _get_valid_resolutions()
    if resolution not in valid_resolutions:
        return (
            "Invalid resolution. Valid resolutions are: hourly, daily, weekly, monthly, yearly",
            400,
        )

    # Check if year is valid
    valid_years = _get_valid_years(client, bucket, [measurement], unit, "1mo")
    if year not in valid_years:
        return (
            "No data for this year.",
            404,  # TODO: Consider changing to 204
        )

    measured_data = query_measured_data(client, year, resolution, bucket, measurement, unit, fields)
    client.close()

    processed_measured_data = process_measured_data(measured_data, fields, resolution)

    final_structure = create_final_measured_data_structure(
        processed_measured_data,
        fields,
        measurement,
        unit,
        year,
    )

    response = jsonify(final_structure)
    return response


@api_blueprint.route("/energy-summary-modeled-field-data", methods=["GET"])
def get_energy_summary_modeled_field_data():
    client = create_influxdb_client()  # TODO: Memoize

    bucket = request.args.get("bucket", Config.INFLUXDB_DEFAULT_BUCKET)
    measurement = request.args.get("measurement")
    fields = request.args.get("fields").split(",")
    models = request.args.get("models").split(",")
    year = int(request.args.get("year"))
    resolution = request.args.get("resolution", "monthly")
    unit = "kilowattHours"

    # Check if resolution is valid
    valid_resolutions = _get_valid_resolutions()
    if resolution not in valid_resolutions:
        return (
            "Invalid resolution. Valid resolutions are: hourly, daily, weekly, monthly, yearly",
            400,
        )

    # Check if year is valid
    valid_years = _get_valid_years(client, bucket, [measurement], unit, "1mo")
    if year not in valid_years:
        return (
            "No data for this year.",
            404,  # TODO: Consider changing to 204
        )

    modeled_data = query_modeled_data(client, year, resolution, bucket, measurement, unit, fields, models)
    client.close()

    processed_modeled_data = process_modeled_data(modeled_data, fields, models, resolution)

    final_structure = create_final_modeled_data_structure(
        processed_modeled_data,
        fields,
        models,
        measurement,
        unit,
        year,
    )

    response = jsonify(final_structure)
    return response
