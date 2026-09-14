# Tracify Analytics templates

Read-only Nango templates for the Tracify Analytics API. They use the `tracify` provider, which stores `siteId` and `presetId` in the connection configuration and sends the API key as the `tracify-token` header.

## Action functions

All action functions issue `GET` requests through the Nango proxy and validate their inputs with Zod.

| Function | Tracify route |
| --- | --- |
| KPI overview | `/analytics/api/v1/kpis/overview/` |
| KPI channels | `/analytics/api/v1/kpis/channels/` |
| KPI channel | `/analytics/api/v1/kpis/channels/{channel}/` |
| KPI channel breakdown | `/analytics/api/v1/kpis/channels/{channel}/{breakdown_dimension}` |
| KPI channel export status | `/analytics/api/v1/kpis/channels/{channel}/exports/{task_id}` |
| KPI NVR by channel | `/analytics/api/v1/kpis/nvr_daily_breakdown/{channel}` |
| KPI NVR | `/analytics/api/v1/kpis/nvr_daily_breakdown` |
| KPI discount codes | `/analytics/api/v1/kpis/discount_codes` |

NVR requests are limited to seven days by Tracify. The NVR action functions enforce that limit before making a provider request.

## Sync functions

The following full Sync functions run hourly and read their connection configuration. They retain one normalized record per request and remove records from previous full-sync executions after successfully saving the new data.

| Sync function | Default window |
| --- | --- |
| KPI overview | 30 days |
| KPI channels | 30 days |
| KPI discount codes | 30 days |
| KPI NVR | 7 days |

The templates do not configure or call Tracify's Events API and contain no write operations.

## Sources

- [Tracify Analytics API documentation](https://tracify.dev/analytics-api/)
- [Tracify Analytics OpenAPI specification](https://tracify-api.tracify.ai/analytics/api/v1/openapi.json)
