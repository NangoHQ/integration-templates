# Items

## General Information
- **Description:** Fetches all items in QuickBooks. Handles both active and archived items, saving or deleting them based on their status.

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: com.intuit.quickbooks.accounting
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/quickbooks-sandbox/syncs/items.ts)

### Request Endpoint

- **Path:** `/items`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

### Request Response

```json
{
  "created_at": "<string>",
  "updated_at": "<string>",
  "id": "<string>",
  "name": "<string>",
  "active": "<boolean>",
  "type": "<string>",
  "unit_price_cents": "<number>",
  "purchase_cost_cents": "<number>",
  "qty_on_hand": "<number | null>",
  "inv_start_date": "<string | null>",
  "description": "<string | null>",
  "track_qty_onHand": "<boolean>"
}
```

## Changelog


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/quickbooks-sandbox/syncs/items.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/quickbooks-sandbox/syncs/items.md)

<!-- END  GENERATED CONTENT -->



undefined