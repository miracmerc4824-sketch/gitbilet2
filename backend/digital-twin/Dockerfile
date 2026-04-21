FROM python:3.12-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8007
HEALTHCHECK --interval=20s --timeout=5s --retries=5 --start-period=30s \
  CMD curl -f http://localhost:8007/health || exit 1
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8007", "--ws", "websockets"]
