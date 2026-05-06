# Scaling Pixora to 100x Traffic — Operational Notes

This document lists pragmatic, prioritized steps to make Pixora handle an order-of-magnitude more traffic.

1) Horizontal scaling + stateless app
- Run multiple app instances behind a CDN/load-balancer.
- Ensure sessions are stateless (signed cookies) and session DB writes are optional/fallback-only.

2) Connections and DB pooling
- Put a connection pooler (PgBouncer) between Prisma and Postgres to avoid connection exhaustion.
- Use read replicas for heavy read traffic and route reads there where possible.
- Ensure Prisma client is shared/cached in serverless envs (already implemented in `src/lib/prisma.ts`).

3) Cache tier
- Use Redis (Upstash or managed Redis) for rate-limits, sessions (if using server-side), caching expensive queries, and queues.
- Cache frequently-read gallery metadata and photo lists with short TTLs.

4) Rate-limiting, throttling and DDoS
- Enforce IP and endpoint-level rate limits at the edge (CDN) and in-app (Upstash-based throttles already present).
- Fail open to local in-memory fallback only when Redis is unavailable, and prefer conservative thresholds.

5) Background workers
- Offload email/sms and heavy IO to worker processes. Use Redis-backed queues and dedicate autoscaled worker fleets.
- Provide a lightweight worker script (`scripts/run-job-worker.mjs`) to process email jobs.

6) Storage and CDN
- Store image assets in Cloudinary / S3 and serve via CDN.
- Use signed URLs for uploads and direct-to-CDN/offload uploads.

7) Observability
- Ship structured logs and metrics (request latency, error rates, DB connections, queue lengths) to a monitoring system.
- Add health checks and alerting for high error rates, worker backlog, and high DB connection counts.

8) Security
- Harden headers (CSP, HSTS, COOP) — `middleware.ts` already sets strict headers.
- Use WAF/edge rules to block known bad traffic patterns.

9) Testing and release
- Run pre-production stress tests (k6, Artillery) to validate scaling assumptions.
- Do incremental capacity tests: ramp RPS, evaluate DB pool pressure and worker backlog.

10) Operational checklist
- Add autoscaling policies for the app and worker pools.
- Ensure backups, point-in-time recovery and tested rollback steps for DB migrations.

If you want, I can produce an actionable rollout plan (exact infra pieces, load-test script, and a cost estimate) next.
