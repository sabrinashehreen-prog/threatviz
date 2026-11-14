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

## Deployment health check

Configure your hosting platform's health-check probe to request `GET /api/health`. The endpoint returns HTTP `200` with `status: "ok"` when the prediction service is reachable, including its response latency. If no prediction URL is configured, it reports `predictionService: "sample"` as healthy because the app is using its built-in sample data. When the configured service returns an error or cannot be reached within five seconds, the endpoint returns HTTP `503`. The response never includes the API key or upstream response body. The check makes a request to the configured prediction endpoint, so use a provider probe interval appropriate for your service's rate limits.

## Deployment readiness probe

Configure a separate readiness probe to request `GET /api/ready`. Unlike `/api/health`, readiness verifies that the prediction payload is valid: it checks the built-in sample predictions when no upstream URL is configured, or fetches and validates the configured service response. It returns HTTP `200` only when the payload is valid and HTTP `503` for invalid data, upstream errors, or timeouts. The response includes only a status, payload-validity result, and optional latency; it never exposes the API key or upstream response body. This probe makes an upstream request when live predictions are configured, so account for the service's rate limits.

## Development

Run the development server with:

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).
