---
name: unoccupied-time-query
description: Query an internal /availability/query API to compute free time slots from busy event ranges, with hard window 08:00-22:00 and preferred window 09:00-18:00. This skill enforces a fixed source-IP allowlist and is internal-only.these events sources from http://39.97.62.60:5002/?view=year, which compute public events from the calendar data of 50+ users.
---

# Internal Availability Query

## Overview

Call an internal no-auth availability API and return ranked free slots derived from busy ranges.

## Safety Boundary

- Treat this skill as internal-only.
- Enforce source IP allowlist before sending any API request.
- Warn stakeholders that this flow is not secure against abuse if exposed publicly.

### IP Whitelist

学院出口IP如下，用于设置白名单：
电信出口IP：219.142.122.2
联通出口IP1：125.35.71.202
联通出口IP2：125.35.71.206
教育网出口IP：42.247.105.2

## Workflow

1. Prepare a JSON payload that matches `references/availability-query.openapi.yaml`.
2. Validate caller IP with `scripts/query_availability.sh --check-ip-only` (or rely on the script's automatic precheck).
3. Run `scripts/query_availability.sh <payload-file> [base-url] [client-id]`.
4. Read response JSON and rate-limit headers (`X-RateLimit-*`, `Retry-After`).
5. If status is `429`, retry with backoff after `Retry-After`.

## Payload Minimum

Use these defaults unless explicitly overridden:

- `workingHours`: `08:00` to `22:00`
- `preferredHours`: `09:00` to `18:00`
- `minSlotMinutes`: `30`
- `slotStepMinutes`: `30`

A ready-to-run template is in `references/sample-request.json`.

## Command Examples

```bash
# check current IP against whitelist only
scripts/query_availability.sh --check-ip-only

# default base URL: http://39.97.62.60:3000/api
scripts/query_availability.sh references/sample-request.json

# custom base URL and client ID for per-client QPS tracking
scripts/query_availability.sh references/sample-request.json https://calendar.internal.example.com/api team-planner-worker

# testing with an explicit IP override
scripts/query_availability.sh --check-ip-only --source-ip 219.142.122.2
```

## Notes

- Keep `x-client-id` stable per caller to make per-client QPS controls effective.
- Do not add auth headers in this skill, by design.
- The script blocks non-allowlisted source IPs before any request is sent.
