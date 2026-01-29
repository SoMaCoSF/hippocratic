# OpenTelemetry Setup for Hippocratic Scrapers

Complete guide for setting up OpenTelemetry instrumentation to track scraper performance and throughput.

## 🎯 What You Get

With OpenTelemetry enabled, you can monitor:

- **Request Rates**: Requests per second by domain
- **Response Times**: P50, P95, P99 latencies
- **Throughput**: Bytes downloaded per domain
- **Rate Limiting**: How often delays are applied
- **Cookie Stripping**: Number of tracking cookies blocked
- **Error Rates**: Failed requests by domain
- **Success Rates**: HTTP status code distributions

## 📊 Architecture

```
┌─────────────────┐
│  Scrapers       │
│  (Python)       │
└────────┬────────┘
         │ OTLP
         ↓
┌─────────────────┐     ┌──────────────┐
│  OTel Collector │────→│  Prometheus  │
│  (port 4317)    │     │  (metrics)   │
└────────┬────────┘     └──────────────┘
         │
         ↓
    ┌────────────┐
    │   Jaeger   │
    │  (traces)  │
    └────────────┘
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pip install opentelemetry-api opentelemetry-sdk opentelemetry-exporter-otlp
```

### 2. Start OpenTelemetry Collector (Docker)

```bash
# Simple all-in-one setup
docker run -d --name otel-collector \
  -p 4317:4317 \
  -p 4318:4318 \
  -p 13133:13133 \
  -p 8888:8888 \
  -p 8889:8889 \
  otel/opentelemetry-collector:latest
```

### 3. Start Prometheus (Optional)

```bash
docker run -d --name prometheus \
  -p 9090:9090 \
  prom/prometheus:latest
```

### 4. Start Jaeger (Optional - for traces)

```bash
docker run -d --name jaeger \
  -p 16686:16686 \
  -p 14268:14268 \
  jaegertracing/all-in-one:latest
```

## 🔧 Enable OpenTelemetry in Scrapers

### Option 1: Programmatic (Explicit Opt-In)

```python
from data_sources.privacy_proxy_adapter import create_privacy_session

# Create session with OTel enabled
session = create_privacy_session(
    enable_otel=True,  # MUST explicitly enable
    otel_endpoint="http://localhost:4317",
    strip_cookies=True,  # Optional privacy feature
    randomize_fingerprint=True  # Optional privacy feature
)

# Use normally
response = session.get('https://data.ca.gov/api/...')

# Stats available
print(session.get_stats())
```

### Option 2: Configuration File

```yaml
# otel_config.local.yaml
otel_endpoint: "http://localhost:4317"

features:
  enable_otel: true  # Explicitly enable
  strip_cookies: false  # Keep disabled by default
  randomize_fingerprint: false  # Keep disabled by default
```

## 📈 Available Metrics

### Counters

**`scraper.requests.total`**
- Total HTTP requests
- Labels: `domain`, `status_code`, `method`

**`scraper.bytes.downloaded`**
- Total bytes downloaded
- Labels: `domain`

**`scraper.cookies.stripped`**
- Tracking cookies blocked (if feature enabled)
- Labels: `domain`

**`scraper.rate_limit.delays`**
- Rate limit delays applied
- Labels: `domain`

### Histograms

**`scraper.request.duration`**
- Request latency in milliseconds
- Labels: `domain`, `status_code`

## 📊 Querying Metrics

### Prometheus Queries

```promql
# Request rate by domain
rate(scraper_requests_total[1m])

# Average response time
rate(scraper_request_duration_sum[5m]) / rate(scraper_request_duration_count[5m])

# P95 latency
histogram_quantile(0.95, rate(scraper_request_duration_bucket[5m]))

# Throughput (bytes/sec)
rate(scraper_bytes_downloaded[1m])

# Error rate
rate(scraper_requests_total{status_code=~"5.."}[1m])

# Cookie stripping rate
rate(scraper_cookies_stripped[1m])
```

### Example Dashboards

**Throughput Dashboard:**
```promql
# Total requests/sec
sum(rate(scraper_requests_total[1m]))

# Bytes downloaded/sec
sum(rate(scraper_bytes_downloaded[1m]))

# Requests by domain
sum by (domain) (rate(scraper_requests_total[1m]))
```

**Performance Dashboard:**
```promql
# P50 latency
histogram_quantile(0.50, rate(scraper_request_duration_bucket[5m]))

# P95 latency
histogram_quantile(0.95, rate(scraper_request_duration_bucket[5m]))

# P99 latency
histogram_quantile(0.99, rate(scraper_request_duration_bucket[5m]))
```

**Privacy Features Dashboard:**
```promql
# Cookies stripped
sum(rate(scraper_cookies_stripped[1m]))

# Rate limit delays
sum(rate(scraper_rate_limit_delays[1m]))
```

## 🎨 Visualization

### Grafana Setup

```bash
# Start Grafana
docker run -d --name grafana \
  -p 3000:3000 \
  grafana/grafana:latest

# Access: http://localhost:3000 (admin/admin)
```

**Add Prometheus Data Source:**
1. Configuration → Data Sources → Add Prometheus
2. URL: `http://prometheus:9090`
3. Save & Test

**Import Dashboard:**
- Dashboard ID: 4701 (OpenTelemetry Collector)
- Or create custom dashboard with above PromQL queries

### Jaeger UI

Access traces at: `http://localhost:16686`

Search for:
- Service: `hippocratic-scraper`
- Operation: `http.request`
- Tags: `http.domain`, `http.status_code`

## 📝 Example: Monitor Scraper Session

```python
from data_sources.privacy_proxy_adapter import create_privacy_session
import time

# Create session with OTel
session = create_privacy_session(
    enable_otel=True,
    otel_endpoint="http://localhost:4317"
)

# Run scraping
urls = [
    'https://data.ca.gov/api/3/action/package_list',
    'https://data.chhs.ca.gov/api/views/metadata/v1',
]

for url in urls:
    response = session.get(url)
    print(f"Fetched {url}: {len(response.content)} bytes")
    time.sleep(3)  # Rate limiting

# View stats
stats = session.get_stats()
print(f"\nSession Stats:")
print(f"  Total Requests: {stats['total_requests']}")
print(f"  Total Bytes: {stats['total_bytes_downloaded']:,}")
print(f"  Avg Time: {stats['avg_request_time_ms']:.2f}ms")

# Close (prints final stats)
session.close()
```

## 🔍 Troubleshooting

### OTel Not Working

```python
# Check if OTel is available
from data_sources.privacy_proxy_adapter import OTEL_AVAILABLE
print(f"OpenTelemetry Available: {OTEL_AVAILABLE}")

# If False, install:
pip install opentelemetry-api opentelemetry-sdk opentelemetry-exporter-otlp
```

### Collector Not Receiving Data

```bash
# Check collector logs
docker logs otel-collector

# Test connectivity
curl http://localhost:13133/  # Health check
curl http://localhost:8888/metrics  # Collector metrics
```

### Metrics Not Appearing

1. Verify `enable_otel=True` (OFF by default)
2. Check endpoint: `otel_endpoint="http://localhost:4317"`
3. Ensure collector is running: `docker ps | grep otel`
4. Check scraper logs for errors

## 🎯 Production Setup

### Cloud Deployment

**For Vercel/serverless:**
- Use managed OTel collectors (Grafana Cloud, Honeycomb, etc)
- Set endpoint via environment variable

```bash
export OTEL_ENDPOINT="https://api.honeycomb.io:443"
export OTEL_HEADERS="x-honeycomb-team=YOUR_API_KEY"
```

**For GitHub Actions:**
```yaml
- name: Run scraper with OTel
  env:
    OTEL_ENDPOINT: ${{ secrets.OTEL_ENDPOINT }}
  run: |
    python scrape_with_otel.py
```

### Recommended Services

- **Grafana Cloud** (Free tier available)
- **Honeycomb** (Good for traces)
- **New Relic** (Full observability)
- **Datadog** (Enterprise option)

## 📊 Key Metrics to Monitor

### Performance
- Request latency (P95, P99)
- Throughput (requests/sec, bytes/sec)
- Error rates by domain

### Compliance
- Rate limit adherence (delays applied)
- Cookie stripping effectiveness
- Request distribution by domain

### Capacity
- Concurrent requests
- Memory usage
- CPU usage

## ✅ Best Practices

1. **Start with defaults** (OTel OFF) - Enable only when needed
2. **Monitor in development** first before production
3. **Set up alerts** for error rates > 5%
4. **Track rate limiting** to ensure compliance
5. **Export metrics** to long-term storage (Prometheus)
6. **Create dashboards** for key metrics
7. **Review weekly** to optimize scraper performance

---

**Remember: OpenTelemetry is OPT-IN. Must explicitly enable with `enable_otel=True`**
