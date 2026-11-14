# Threatviz

Predictive network-threat dashboard for small businesses.

## Live attack-map playback

Threatviz's live attack map turns predicted threats into an animated view of activity across your network. Follow a threat as it moves from its suspected origin through affected devices and services, and see where it may reach next. Playback makes it easier to understand the sequence and potential impact of an attack at a glance.

Use the playback controls to start or pause the timeline, scrub through events, and review the threat path at your own pace. Map markers and connecting paths distinguish network assets from predicted threat movement, while the timeline provides context for when each event is expected. Treat predictions as indicators for investigation, not confirmation that an attack has occurred.

## Configure the prediction API

The `/api/threat-predictions` route reads these server-side environment variables:

- `THREAT_PREDICTIONS_API_URL` — URL of the prediction service endpoint.
- `THREAT_PREDICTIONS_API_KEY` — optional bearer token sent in the `Authorization` header.

Configure both values in your deployment provider's project settings under **Environment Variables** or **Secrets**. Add them to every environment that needs live predictions (for example, Production and Preview), then redeploy so the new values are available to the server. At startup, the server validates that the URL is a valid absolute URL and rejects a key configured without a URL; invalid settings prevent the server from starting. The key is optional when a URL is configured. Keep it secret: do not use a `NEXT_PUBLIC_` prefix, commit real credentials, or expose it in client-side code. If the URL is unset, the route returns sample predictions instead.

For local development, copy `.env.example` to `.env.local` and replace the placeholders with your service URL and key. `.env.local` is ignored by Git.

### Prediction payload schema

The configured upstream service must return JSON containing predictions, either as a raw array or as an object with a `predictions` array. Each prediction must include all of the following fields:

| Field        | Type   | Requirements / meaning                                                             |
| ------------ | ------ | ---------------------------------------------------------------------------------- |
| `id`         | string | Prediction identifier.                                                             |
| `source`     | string | Suspected origin or source asset.                                                  |
| `target`     | string | Predicted destination asset.                                                       |
| `type`       | string | Threat or activity description.                                                    |
| `severity`   | string | Severity label, such as `Critical`, `High`, or `Elevated`.                         |
| `timestamp`  | string | Event time; use an ISO 8601 timestamp so playback can order predictions correctly. |
| `color`      | string | CSS color used to render the threat path and marker.                               |
| `confidence` | number | Model confidence from `0` to `100`.                                                |
| `x`, `y`     | number | Source marker coordinates, each from `0` to `100` on the map.                      |
| `tx`, `ty`   | number | Target coordinates, each from `0` to `100` on the map.                             |

The API validates required field types and numeric ranges, but does not validate timestamp format, severity values, or CSS color syntax. Invalid payloads produce HTTP `502` from `/api/threat-predictions`.

Example upstream response:

```json
{
  "predictions": [
    {
      "id": "T-2048",
      "source": "Unknown · 185.220.101.42",
      "target": "Gateway · edge-01",
      "type": "Credential probing",
      "severity": "Critical",
      "confidence": 96,
      "timestamp": "2026-11-14T10:42:18.000Z",
      "color": "#fb7185",
      "x": 18,
      "y": 28,
      "tx": 48,
      "ty": 48
    }
  ]
}
```

The app's `GET /api/threat-predictions` endpoint responds with `{ "predictions": [...], "source": "api" }` when using the configured service, or `source: "sample"` when no upstream URL is configured. The upstream may return the array directly or wrap it in `{ "predictions": [...] }`; the app normalizes either form to the endpoint response shape.

## Deployment health check

Configure your hosting platform's health-check probe to request `GET /api/health`. The endpoint returns HTTP `200` with `status: "ok"` when the prediction service is reachable, including its response latency. If no prediction URL is configured, it reports `predictionService: "sample"` as healthy because the app is using its built-in sample data. When the configured service returns an error or cannot be reached within five seconds, the endpoint returns HTTP `503`. The response never includes the API key or upstream response body. The check makes a request to the configured prediction endpoint, so use a provider probe interval appropriate for your service's rate limits.

## Deployment readiness probe

Configure a separate readiness probe to request `GET /api/ready`. Unlike `/api/health`, readiness verifies that the prediction payload is valid: it checks the built-in sample predictions when no upstream URL is configured, or fetches and validates the configured service response. It returns HTTP `200` only when the payload is valid and HTTP `503` for invalid data, upstream errors, or timeouts. The response includes only a status, payload-validity result, and optional latency; it never exposes the API key or upstream response body. This probe makes an upstream request when live predictions are configured, so account for the service's rate limits.

## CISA known exploited vulnerabilities

`GET /api/vulnerabilities` reads the public [CISA Known Exploited Vulnerabilities catalog](https://www.cisa.gov/known-exploited-vulnerabilities-catalog) and returns its five newest entries. The catalog is free and does not require an API key; the server caches it for one hour. These entries are vulnerability intelligence, not predictions or observations from your network, and are shown separately from the attack-map playback.

## Development

The dashboard works with built-in sample predictions; a live prediction service is optional. To configure one locally, copy the example and add your service URL and optional key:

```bash
cp .env.example .env.local
```

Leave both values blank to use sample data. Keep any real API key in `.env.local`; this file is ignored by Git.

Run the development server with:

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).
