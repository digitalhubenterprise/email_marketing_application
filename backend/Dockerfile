FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

WORKDIR /code

# Install system dependencies needed for compiling certs, psycopg2, etc.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Create a non-privileged user and group
RUN groupadd -g 10001 appgroup && \
    useradd -u 10001 -g appgroup -m -s /bin/bash appuser

# Copy and install Python packages
COPY requirements.txt /code/
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend files
COPY . /code/

# Change ownership of working directory to the non-root user
RUN chown -R appuser:appgroup /code

# Switch to the non-root user
USER appuser

EXPOSE 8000
