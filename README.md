# Visualization suite prototype for visualizing data from the ZEB Laboratory in Trondheim, Norway

**_This project is a part of my NTNU master's thesis during the spring of 2024._**

It consists of two parts:
- API (`api/`)
- Web application (`web/`)


## How to run (locally)

**NOTE**: To run the application, certain environment variables for the database are required.

First, clone the repository:

```bash
git clone https://github.com/stiannyblom/zeb-visualization-suite-prototype.git
```
Then, follow the steps below for both the API and web application parts <u>using separate terminal/cmd windows</u> for each part.

### API
#### Prerequisites
- Python
- [Poetry](https://python-poetry.org/) (package/dependency manager)
- Environment variables for the InfluxDB database (database token and url)

#### Installation
1. Make sure Poetry is installed. If not, follow [this guide](https://python-poetry.org/docs/#installation).
2. Navigate to the `zeb-visualization-suite-prototype/api/` directory.
3. Install the project dependencies with the following command:
    ```bash
    poetry install
    ```

#### Environment Setup
Create a `.env` file, and add the neccessary variables:
```dotenv
INFLUXDB_URL=*influxdb url here*
INFLUXDB_TOKEN=*influxdb token here*
INFLUXDB_ORG=SINTEF
INFLUXDB_DEFAULT_BUCKET=zeb_modell
```

#### Running the API server
1. Activate Poetry shell
    ```bash
    poetry shell
    ```
2. Run the Flask application
    ```
    flask --app wsgi run
    ```

Now, the API server should be running. 
Go on to the next section explaining how to run the Next.js web application.

### Web application
#### Prerequisites
- Node.js
- [pnpm](https://pnpm.io/) (package/dependency manager)

#### Installation
1. Make sure pnpm is installed. If not, follow [this guide](https://pnpm.io/installation).
2. Navigate to the `zeb-visualization-suite-prototype/web/` directory.
3. Install the project dependencies with the following command:
    ```bash
    pnpm install
    ```

#### Environment Setup
Create a `.env.local` file, and add the neccessary variables:
```dotenv
API_HOST=localhost
API_PORT=5000
```
#### Running the web application
2. Run the Next.js development server
    ```
    pnpm run dev
    ```

The web application should now be running alongside the API server.
You can access the visualization suite at the following URL: `http://localhost:3000/`
