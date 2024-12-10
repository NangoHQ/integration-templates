# Update Item

## General Information

- **Description:** Update a single item in QuickBooks.

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: com.intuit.quickbooks.accounting
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/quickbooks-sandbox/actions/update-item.ts)


## Endpoint Reference

### Request Endpoint

- **Path:** `/items`
- **Method:** `PUT`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{}
```

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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/quickbooks-sandbox/actions/update-item.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/quickbooks-sandbox/actions/update-item.md)

<!-- END  GENERATED CONTENT -->

