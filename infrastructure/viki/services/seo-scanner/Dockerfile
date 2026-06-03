FROM mcr.microsoft.com/playwright/python:v1.44.0-noble

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Ensure playwright browsers are installed and verified (especially chromium)
RUN playwright install chromium

COPY . .

EXPOSE 8000

CMD ["python", "seo_scanner.py"]
