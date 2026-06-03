FROM python:3.12-slim

WORKDIR /app

# Install security utilities if needed
RUN apt-get update && apt-get install -y --no-install-recommends \
    clamav \
    tar \
    gzip \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["python", "web_auditor.py"]
