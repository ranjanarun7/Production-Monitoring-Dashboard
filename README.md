# Worker Productivity Dashboard

A small full‑stack reference app for monitoring a factory floor using AI‑generated events from CCTV / computer vision systems. It ingests structured events, stores them, computes productivity metrics, and serves a simple dashboard for 6 workers and 6 workstations.

This README is written to be practical for someone cloning the repo and reviewing the system, not as a whitepaper.

---

## 1. What This Project Does

- Ingests AI event data over HTTP (single events and batches)
- Persists workers, workstations, and events in MongoDB
- Computes worker, workstation, and factory‑level productivity metrics
- Pre‑seeds the database with realistic dummy data (6 workers, 6 stations)
- Exposes a REST API used by a React dashboard
- Provides a basic way to reseed / refresh demo data from the UI
- Is fully dockerized with a single `docker-compose up` run path

The implementation is intentionally small but follows production‑style patterns (separation of routes, services, models, and a thin frontend that only talks to the API).

---

## 2. Architecture Overview (Edge → Backend → Dashboard)

High‑level flow:

1. **Edge / CV system** (outside this repo)
   - CCTV + computer vision model detect worker posture / activity.
   - That system emits structured JSON events like `working`, `idle`, `absent`, and `product_count`.

2. **Backend API (Node.js + Express)**
   - JSON events come in via `POST /api/events` or `POST /api/events/batch`.
   - Events are validated and written to MongoDB.
   - A metrics service aggregates events into per‑worker, per‑station, and factory‑level metrics over a time window.

3. **Database (MongoDB)**
   - Stores three main collections: `workers`, `workstations`, and `events`.
   - Seed scripts and a reseed API create dummy data for demos.

4. **Frontend Dashboard (React)**
   - Calls `/api/metrics/*` and `/api/workers` / `/api/workstations`.
   - Renders:
     - Factory summary cards
     - 6 worker cards
     - 6 workstation cards
   - Allows date‑range selection and reseeding sample data from the UI.

In short:

```text
Edge Cameras & CV  →  Backend API  →  MongoDB  →  Metrics Service  →  React Dashboard
```

---

## 3. Data Model & Database Schema

MongoDB is used for simplicity and because it’s easy to seed with realistic time‑series data.

### Workers

Each worker is identified by a stable `worker_id` like `W1`–`W6`.

```json
{
  "worker_id": "W1",           // unique, indexed
  "name": "Assembly Line Operator – Station A",
  "email": "operator.a@acme-factory.com",
  "department": "Assembly",
  "shift": "day",             // e.g. day / night
  "isActive": true,
  "createdAt": "…",
  "updatedAt": "…"
}
```

### Workstations

Each station is identified by `station_id` like `S1`–`S6`.

```json
{
  "station_id": "S1",          // unique, indexed
  "name": "Assembly Line — Conveyor A",
  "type": "assembly",          // enum: assembly, packaging, quality_check, welding, testing, …
  "location": "Manufacturing Wing, Floor 1",
  "capacity": 1,
  "isOperational": true,
  "createdAt": "…",
  "updatedAt": "…"
}
```

### Events

Events are the core input from the computer vision system.

```json
{
  "timestamp": "2026-02-28T10:15:00Z",   // indexed
  "worker_id": "W1",                    // indexed
  "workstation_id": "S3",               // indexed
  "event_type": "working",              // working | idle | absent | product_count
  "confidence": 0.93,                    // 0–1
  "count": 1,                            // for product_count only
  "duration": 5,                         // minutes; optional
  "metadata": {                          // optional extra info from CV system
    "camera_id": "CAMERA_001",
    "model_version": "v1.0"
  },
  "isProcessed": false,
  "createdAt": "…",
  "updatedAt": "…"
}
```

**Indexes** (simplified description):

- `(worker_id, timestamp)` – efficient worker timelines
- `(workstation_id, timestamp)` – efficient station timelines
- `(timestamp, isProcessed)` – for batch processing or ETL down the line

---

## 4. Metrics and Assumptions

The system computes metrics by scanning events over a given time window (default: last 24 hours, overrideable via query params / date picker).

### Time & Duration Assumptions

- If `duration` is not provided by the CV system, we assume **1 minute per event**.
- Time windows are based on **event timestamp in UTC**, not arrival time.
- For simplicity the app doesn’t model shifts explicitly; a typical usage is “last 24 hours” or “shift start/end” via manual time selection.

### Worker‑Level Metrics

For a worker over a time window:

- **Total Active Time (min)**
  - Sum of `duration` for events where `event_type = "working"`.

- **Total Idle Time (min)**
  - Sum of `duration` for events where `event_type = "idle"`.

- **Utilization (%)**
  - Formula:  
    $\text{utilization} = \frac{\text{active}}{\text{active} + \text{idle}} \times 100$

- **Total Units Produced**
  - Sum of `count` for events where `event_type = "product_count"`.

- **Units per Hour**
  - Formula (using active time):  
    $\text{units/hour} = \frac{\text{total units}}{\text{active minutes} / 60}$

- **Average Confidence**
  - Simple mean of `confidence` across all events for that worker in the window.

### Workstation‑Level Metrics

- **Occupancy Time (min)**
  - Sum of `duration` for `working` events for that station.

- **Idle Time (min)**
  - Sum of `duration` for `idle` events for that station.

- **Utilization (%)**
  - Same formula as workers but using occupancy vs idle at the station.

- **Total Units Produced**
  - Sum of `count` for `product_count` events at that station.

- **Throughput (units/hour)**
  - $\text{throughput} = \frac{\text{total units}}{\text{occupancy minutes} / 60}$

- **Workers Assigned**
  - Count of unique `worker_id` values that had events at that station in the time window.

### Factory‑Level Metrics

Factory metrics aggregate across all workers / stations:

- **Total Productive Time (min)**
  - Sum of all `working` durations.

- **Total Idle Time (min)**
  - Sum of all `idle` durations.

- **Total Production Count (units)**
  - Sum of all `count` where `event_type = "product_count"`.

- **Average Production Rate (units/hour)**
  - Using total productive time:  
    $\text{avg rate} = \frac{\text{total units}}{\text{total productive minutes} / 60}$

- **Average Worker Utilization (%)**
  - Mean of utilization% across all workers that had events in the window.

- **Factory Utilization (%)**
  - $\text{factory util} = \frac{\text{total productive}}{\text{productive} + \text{idle}} \times 100$

All of these formulas are implemented in the backend `MetricsService` and surfaced through `/api/metrics/*` endpoints.

---

## 5. Running the Application

You can run everything with Docker (recommended) or run Mongo + Node + React manually.

### Option A: Docker Compose (recommended)

Requirements:

- Docker
- Docker Compose

Commands:

```bash
git clone <this-repo-url>
cd AI-Powered Worker Productivity Dashboard

docker-compose up --build
```

What you get:

- MongoDB at `mongodb://localhost:27017/worker-productivity`
- Backend API at `http://localhost:5000`
- Frontend at `http://localhost:3000`

The database is seeded on first run by the backend startup script / manual seed as described below. You can then use the “Generate Sample Data” button on the dashboard to reseed.

### Option B: Manual (for development)

1. **Start MongoDB** locally or point `MONGODB_URI` to a cloud instance.

2. **Backend**

```bash
cd backend
npm install
npm run seed    # populate workers, workstations, and events
npm start       # http://localhost:5000
```

3. **Frontend**

```bash
cd frontend
npm install
npm start       # http://localhost:3000
```

If the backend is running on a different host/port, set `REACT_APP_API_URL` in `frontend/.env`.

---

## 6. API Surface (Short Reference)

Only the key endpoints are listed here. For a quick feel, you can hit these with `curl` or Postman.

### Workers

- `GET /api/workers` – list all workers
- `GET /api/workers/:worker_id` – single worker

### Workstations

- `GET /api/workstations` – list all stations
- `GET /api/workstations/:station_id` – single station

### Events (Ingestion & Query)

- `POST /api/events` – ingest a single event
- `POST /api/events/batch` – ingest a batch of events `{ events: [...] }`
- `GET /api/events` – list events (supports `worker_id`, `workstation_id`, `event_type`, `start_date`, `end_date`, `skip`, `limit`)
- `GET /api/events/statistics` – simple breakdown of events by type
- `DELETE /api/events/clear` – clear events (demo/testing only)
- `POST /api/events/reseed` – reseed sample events for the last 24 hours

### Metrics

- `GET /api/metrics/factory` – factory‑level metrics
- `GET /api/metrics/worker/:worker_id` – single worker metrics
- `GET /api/metrics/workstation/:station_id` – single station metrics
- `GET /api/metrics/workers/all` – metrics for all workers
- `GET /api/metrics/workstations/all` – metrics for all stations

### Audit / Diagnostics

- `GET /api/metrics/audit/duplicates` – detect duplicate events
- `GET /api/metrics/audit/out-of-order/:worker_id` – detect out‑of‑order timestamps for a worker

Example event ingestion:

```bash
curl -X POST http://localhost:5000/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": "2026-02-28T10:15:00Z",
    "worker_id": "W1",
    "workstation_id": "S1",
    "event_type": "working",
    "confidence": 0.93,
    "duration": 5
  }'
```

---

## 7. Dashboard Behaviour

The React dashboard is intentionally simple and focused on the assessment requirements.

It shows:

- **Factory Summary**
  - Total productive time, total production, average production rate, average utilization, factory utilization, active workers/stations, total events.

- **Workers Section**
  - 6 cards (one per worker) with utilization, active/idle time, total units, units/hour, average confidence.
  - Sort options (by name, utilization, production, active time).
  - Click to focus/select a worker (visual emphasis only).

- **Workstations Section**
  - 6 cards (one per station) with utilization, occupancy/idle time, total units, throughput, number of workers used.
  - Sort options (by name, utilization, production, throughput).
  - Click to focus/select a station.

- **Controls**
  - Date‑time pickers for `From` and `To` (maps to `start_date` / `end_date` query params).
  - `Refresh Data` button to re‑fetch metrics for the current range.
  - `Generate Sample Data` button which triggers `/api/events/reseed`, waits briefly, then reloads metrics.

This satisfies the “factory summary + worker table/cards + workstation table/cards + ability to filter/select” requirement from the brief.

---

## 8. Handling Edge Cases (Connectivity, Duplicates, Out‑of‑Order)

This section directly answers the four “how do you handle…” questions from the assessment.

### 8.1 Intermittent Connectivity

Assumption: cameras or edge devices might lose connectivity to the central API temporarily.

How this project handles / is designed to handle it:

- **Batch ingestion**: `POST /api/events/batch` accepts multiple events at once, so an edge device can buffer locally and flush when online again.
- **Idempotency via duplicate detection**: the backend checks for duplicates in a 1‑second window (same worker, station, event_type, and timestamp) and ignores obvious repeats.
- **Retry friendly**: the API is stateless and can be called repeatedly; on the client you can implement exponential backoff and re‑send buffered events without corrupting metrics.

In a real deployment you would run a small queue on the camera box (or use MQTT/Kafka at the edge); this repo just demonstrates the API patterns you would push events into.

### 8.2 Duplicate Events

Possible causes: network retries, edge software bugs, or double‑sending from the CV system.

What the backend does:

- On ingest, `EventService.ingestEvent` searches for an existing event with:
  - same `worker_id`, `workstation_id`, `event_type`
  - `timestamp` within ±1 second
- If found, it returns a “duplicate” response and does **not** insert a new row.
- There is also an audit endpoint, `GET /api/metrics/audit/duplicates`, that uses a MongoDB aggregation to surface any duplicates that slipped through (e.g., if you relax the window or change logic later).

This keeps metrics from being inflated due to repeated sends.

### 8.3 Out‑of‑Order Timestamps

Problem: edge devices may have drifted clocks, or delayed uploads; events can arrive out of order.

Project behaviour:

- Metrics are always computed by **sorting events by `timestamp`**, not by `createdAt`.
- A diagnostics endpoint, `GET /api/metrics/audit/out-of-order/:worker_id`, scans the ordered timeline for a worker and flags any regressions where a later event has an earlier timestamp than the previous one.
- Events with timestamps far in the future can be flagged in metadata for manual review.

All of this is enough for a small demo but also mirrors what you would do in a production system (event‑time vs processing‑time semantics).

---

## 9. Model Versioning, Drift Detection, and Retraining

The actual CV model is out of scope for this coding task, but the data model and metrics give you hooks for managing it.

### 9.1 Adding Model Versioning

Minimal changes you’d make in a real system:

- **Event payloads** include model metadata, e.g.:

  ```json
  "metadata": {
    "model_version": "v2.1",
    "model_hash": "sha256:…",
    "camera_firmware": "1.4.2"
  }
  ```

- **Schema extension**: add a `model_info` subdocument on events (version, hash, training data version, deployment date).
- **Indexing**: index `model_info.version` + `timestamp` so you can query and compare metrics per model version.
- **APIs**: extend metrics endpoints with optional `model_version` filters to compare performance between versions.

### 9.2 Detecting Model Drift

Signals you can compute off this dataset:

- Drop in **average confidence** for the same model version over time.
- Changes in **event type distribution** (e.g. sudden spike in `idle` vs `working`).
- Deviations in **units/hour** or **utilization** that can’t be explained by production schedules.

In practice, you would run periodic jobs that:

1. Compute recent confidence / event distributions for each model version.
2. Compare them to historical baselines.
3. Raise an alert (or change a status field) if drift in confidence or distribution crosses a threshold.

The README used to include full pseudo‑implementations for these jobs; those details are straightforward to add on top of the existing schema and are omitted here to keep things readable.

### 9.3 Triggering Retraining

Once drift is detected, you generally:

1. Snapshot the last N weeks of events as a training dataset.
2. Launch a training job in your ML platform (SageMaker, Kubeflow, custom pipelines, etc.).
3. Track that job in a `training_jobs` collection or external system.
4. When a new model is validated, roll it out and start writing its `model_version` into event metadata.

This application already stores the raw events and confidence scores you’d need for that loop; the actual ML pipeline is assumed to live outside this repo.

---

## 10. Scaling: 5 Cameras → 100+ Cameras → Multi‑Site

The codebase itself is sized for a small demo. This section describes how you’d evolve it.

### 10.1 5–30 Cameras (Single Site)

At this scale, the current architecture is fine:

- Single Express backend container
- Single MongoDB instance
- One React frontend

Simple improvements you would make:

- Increase Mongo connection pool size.
- Add basic API rate limiting and request logging.
- Use a small cache (e.g. Redis) for frequently accessed metrics.

### 10.2 30–100 Cameras (Scaling Up a Single Site)

Once event volume grows, you’d typically:

- Run multiple backend instances behind a load balancer (Nginx / cloud LB).
- Move MongoDB to a **replica set** with proper backups.
- Offload heavy aggregations to background jobs or aggregate queries directly in Mongo.
- Cache aggregated metrics with a short TTL so the dashboard stays fast.

The data model in this repo (worker_id, workstation_id, timestamp indexes) is already compatible with that plan.

### 10.3 100+ Cameras / Multi‑Site

For multi‑site scenarios you usually introduce:

- **Regional deployments** (one backend + DB cluster per site).
- **Global API gateway** to front those regions.
- **Event streaming** (Kafka or similar) to ship summarized or raw events into a central analytics store.
- **Central analytics** (data lake + batch or streaming jobs) to compute cross‑site KPIs.

The important part for this exercise is that the **event schema and metrics logic** here can be reused in that larger architecture without changes.

---

## 11. Troubleshooting Notes

- If the backend fails to start with `EADDRINUSE` on port 5000, there is already a process bound to that port. Stop the old Node process or container first, then run `npm start` again.
- If the dashboard shows zeros everywhere:
  - Make sure MongoDB is running and reachable.
  - Run `npm run seed` in `backend/` **or** press “Generate Sample Data” in the UI.
- If the frontend can’t reach the backend from Docker:
  - Check CORS headers.
  - Check that `REACT_APP_API_URL` is set correctly when building the frontend image.

---

## 12. License & Status

- License: MIT (or as specified in the repo).
- Status: Demo / reference implementation for an  factory productivity dashboard.

