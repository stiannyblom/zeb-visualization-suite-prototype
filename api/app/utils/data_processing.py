import numpy as np
import pandas as pd


def clean_data(df):
    """Clean the DataFrame by renaming columns, keeping only relevant columns."""
    # Rename columns
    df.rename(
        columns={
            "_time": "time",
            "_field": "field",
            "_value": "value",
            "Model": "model",
            "Carrier": "carrier",
        },
        inplace=True,
    )

    # Keep only relevant columns
    df = df[df.columns.intersection(["time", "field", "value", "model", "carrier"])]

    return df


def add_carrier_column(df, default_carrier):
    """Ensure the DataFrame has a 'carrier' column with a default value."""
    if "carrier" not in df.columns:
        df["carrier"] = default_carrier
    return df


def convert_time_to_string(df, resolution):
    """Convert 'time' to string format based on resolution."""
    if resolution == "hourly":
        period = "h"
    elif resolution == "daily":
        period = "D"
    elif resolution == "weekly":
        period = "W"
    elif resolution == "monthly":
        period = "M"
    elif resolution == "yearly":
        period = "Y"
    df["time"] = pd.to_datetime(df["time"]).dt.to_period(period).astype(str)

    return df


def convert_time_and_pivot(df, time_resolution, value_column, index_columns):
    """Format 'time' and pivot the DataFrame."""
    df = convert_time_to_string(df, time_resolution)
    return df.pivot(index="time", columns=index_columns, values=value_column)


def calculate_period_to_period_differences(df):
    """Calculate period-to-period differences for each column."""
    df = df.diff().shift(-1).reset_index()

    # Drop last row
    df.drop(df.tail(1).index, inplace=True)

    return df


def create_empty_dataframe_with_structure(fields, models):
    """Create an empty DataFrame with columns."""
    default_carriers = ["Unknown"]

    # Create MultiIndex based on the field, carrier, and model
    field_carrier_model_index = pd.MultiIndex.from_product(
        [fields, default_carriers, models], names=("field", "carrier", "model")
    )

    # Create a separate MultiIndex for 'time'
    time_index = pd.MultiIndex.from_product([["time"], [""], [""]], names=("field", "carrier", "model"))

    # Combine the indices
    combined_index = time_index.append(field_carrier_model_index)

    # Return an empty DataFrame with the newly created columns
    return pd.DataFrame(columns=combined_index)


def process_measured_data(df, fields, resolution):
    """Process measured data DataFrame."""
    if df.empty:
        return df

    df = clean_data(df)
    df = add_carrier_column(df, "Electric")
    df = convert_time_and_pivot(df, resolution, "value", ["field", "carrier"])
    df = calculate_period_to_period_differences(df)

    # Ensure all fields exist
    for field in fields:
        if field not in df.columns.levels[0].drop("time").tolist():
            df[field, "Unknown"] = None
    return df


def process_modeled_data(df, fields, models, resolution):
    """Process modeled data DataFrame."""
    if df.empty:
        # TODO: Consider removing this
        df = create_empty_dataframe_with_structure(fields, models)
    else:
        df = clean_data(df)
        df = add_carrier_column(df, "Unknown")
        df = convert_time_and_pivot(df, resolution, "value", ["field", "carrier", "model"])
        df = calculate_period_to_period_differences(df)

        # Ensure all fields and models exist
        for field in fields:
            for model in models:
                if (field, "Unknown", model) not in df.columns:
                    df[field, "Unknown", model] = None

    return df


def extract_column_names(df):
    """Extract field, carrier, and model column names from DataFrame."""
    fields = df.columns.get_level_values(0).drop("time").unique().tolist()
    carriers = df.columns.get_level_values(1).drop("").unique().tolist()
    models = df.columns.get_level_values(2).drop("").unique().tolist() if len(df.columns.levels) > 2 else []

    return fields, carriers, models


def generate_modeled_data_dict(row, field, carrier, models):
    """Generate dict for modeled data for a specific field and carrier."""
    # Retrieve modeled data
    modeled_data = {model: row.get(f"{field}_{carrier}_{model}", None) for model in models}
    # Remove models with None values to see if any valid data exists
    not_none = {k: v for k, v in modeled_data.items() if v is not None}

    # If modeled_data is not empty, use it, otherwise set it to None
    return modeled_data if len(not_none) > 0 else None


def build_combined_data_json(
    row,
    fields,
    models,
    fields_measured,
    fields_modeled,
    carriers_measured,
    carriers_modeled,
):
    """Build the JSON structure for each row."""
    fields_data = {}

    for field in fields:
        fields_data[field] = {}

        # Process measured data
        if field in fields_measured:
            for carrier in carriers_measured:
                fields_data[field][carrier] = {"measured": row.get(f"{field}_{carrier}", None)}

        if len(models) > 0:
            # Process modeled data
            if field in fields_modeled:
                for carrier in carriers_modeled:
                    if carrier not in fields_data[field]:
                        fields_data[field][carrier] = {}

                    fields_data[field][carrier].update(
                        {"modeled": generate_modeled_data_dict(row, field, carrier, models)}
                    )

    return {"time": row["time"], "fields": fields_data}


def build_measured_data_json(
    row,
    fields,
    fields_measured,
    carriers_measured,
):
    """Build the JSON structure for each row."""
    fields_data = {}

    for field in fields:
        # Process measured data
        if field in fields_measured:
            fields_data[field] = {}
            for carrier in carriers_measured:
                fields_data[field][carrier] = {"measured": row.get(f"{field}_{carrier}", None)}

    return {"time": row["time"], "fields": fields_data}


def build_modeled_data_json(
    row,
    fields,
    models,
    fields_modeled,
    carriers_modeled,
):
    """Build the JSON structure for each row."""
    fields_data = {}

    for field in fields:
        # Process modeled data
        if field in fields_modeled:
            fields_data[field] = {}
            for carrier in carriers_modeled:
                if carrier not in fields_data[field]:
                    fields_data[field][carrier] = {}

                fields_data[field][carrier] = {"modeled": generate_modeled_data_dict(row, field, carrier, models)}

    return {"time": row["time"], "fields": fields_data}


def create_final_combined_data_structure(
    df_measured,
    df_modeled,
    fields,
    models,
    measurements,
    unit,
    year,
):
    """Create the final combined data structure."""

    # Extract column names
    fields_measured, carriers_measured, _ = extract_column_names(df_measured)

    # Flatten MultiIndices
    df_measured.columns = ["time"] + [f"{field}_{carrier}" for field, carrier in df_measured.columns.unique()[1:]]

    if df_modeled is not None:
        # Extract column names
        fields_modeled, carriers_modeled, _ = extract_column_names(df_modeled)

        # Flatten MultiIndices
        df_modeled.columns = ["time"] + [
            f"{field}_{carrier}_{model}" for field, carrier, model in df_modeled.columns.unique()[1:]
        ]

        # Merge the dataframes
        df_combined = pd.merge(df_measured, df_modeled, on="time", how="outer")
    else:
        fields_modeled = []
        carriers_modeled = []
        df_combined = df_measured

    # Replace NaN values with None
    df_combined = df_combined.replace({np.nan: None})

    # Apply the function to each row and create JSON
    metadata = {
        "fields": fields,
        "models": models if df_modeled is not None else [],
        "carriers": list(set(carriers_measured + carriers_modeled)),
        "measurements": measurements,
        "unit": unit,
        "year": year,
    }

    return {
        "data": df_combined.apply(
            lambda row: build_combined_data_json(
                row,
                fields,
                models,
                fields_measured,
                fields_modeled,
                carriers_measured,
                carriers_modeled,
            ),
            axis=1,
        ).tolist(),
        "metadata": metadata,
    }


def create_final_measured_data_structure(
    df_measured,
    fields,
    measurement,
    unit,
    year,
):
    """Create the final data structure for measured data."""

    # Extract column names
    fields_measured, carriers_measured, _ = extract_column_names(df_measured)

    # Flatten MultiIndices
    df_measured.columns = ["time"] + [f"{field}_{carrier}" for field, carrier in df_measured.columns.unique()[1:]]

    # Replace NaN values with None
    df_measured = df_measured.replace({np.nan: None})

    metadata = {
        "measurement": measurement,
        "fields": fields,
        "unit": unit,
        "year": year,
    }

    # Apply the function to each row and create JSON
    return {
        "data": df_measured.apply(
            lambda row: build_measured_data_json(
                row,
                fields,
                fields_measured,
                carriers_measured,
            ),
            axis=1,
        ).tolist(),
        "metadata": metadata,
    }


def create_final_modeled_data_structure(
    df_modeled,
    fields,
    models,
    measurement,
    unit,
    year,
):
    """Create the final data structure for modeled data."""

    # Extract column names
    fields_modeled, carriers_modeled, models_modeled = extract_column_names(df_modeled)

    # Flatten MultiIndices
    df_modeled.columns = ["time"] + [
        f"{field}_{carrier}_{model}" for field, carrier, model in df_modeled.columns.unique()[1:]
    ]

    # Replace NaN values with None
    df_modeled = df_modeled.replace({np.nan: None})

    # Apply the function to each row and create JSON
    metadata = {
        "measurement": measurement,
        "fields": fields,
        "models": models,
        "unit": unit,
        "year": year,
    }

    return {
        "data": df_modeled.apply(
            lambda row: build_modeled_data_json(
                row,
                fields,
                models,
                fields_modeled,
                carriers_modeled,
            ),
            axis=1,
        ).tolist(),
        "metadata": metadata,
    }


def get_unique_years_from_df(df):
    # Sort by time and drop duplicates
    df.sort_values(by="_time", inplace=True)
    df.drop_duplicates(subset="_time", keep="first", inplace=True)

    # Drop the last row
    df.drop(df.tail(1).index, inplace=True)

    # Get unique years
    unique_years = df["_time"].dt.year.unique().tolist()

    return sorted(unique_years)


def get_unique_years_from_df_list(df_list):
    # Initialize a set to store unique years
    unique_years_set = set()

    for df in df_list:
        unique_years = get_unique_years_from_df(df)
        unique_years_set.update(unique_years)

    return list(sorted(unique_years_set))
