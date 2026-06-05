FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install chromium and system libraries required for headlessly rendering JS and generating client PDF reports
RUN playwright install --with-deps chromium

COPY . .

EXPOSE 8000

CMD ["python", "spider_app.py"]
