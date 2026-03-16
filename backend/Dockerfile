# backend/Dockerfile
FROM python:3.12-slim

# Install uv to gracefully handle pyproject.toml
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Create a non-root user
RUN addgroup --gid 1001 appgroup && \
    adduser --system --uid 1001 --gid 1001 appuser

WORKDIR /app

# Ensure uv behaviors
ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy
ENV UV_NO_CACHE=1

# Optimize layer caching
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project --no-dev

# Copy application code
COPY . .
RUN uv sync --frozen --no-dev
RUN chown -R appuser:appgroup /app

# SQLite directory requires explicit write permissions for the user
RUN mkdir -p /app/data && chown -R appuser:appgroup /app/data

USER 1001

EXPOSE 8001
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
