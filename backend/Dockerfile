# Use an official lightweight Python runtime as a parent image
FROM python:3.11-slim

# Set system environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8001

# Set the working directory in the container
WORKDIR /app

# Install system dependencies needed for compiling python packages (like psycopg2, passlib)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy only the requirements file first to leverage Docker's caching mechanism
COPY requirements.txt /app/

# Install the Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code into the container
COPY . /app/

# Expose the port the backend runs on
EXPOSE 8001

# Command to run the application using uvicorn in production
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
