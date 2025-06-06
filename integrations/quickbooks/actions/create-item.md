<!-- BEGIN GENERATED CONTENT -->
# Create Item

## General Information

- **Description:** Creates a single item in QuickBooks.

- **Version:** 0.0.1
- **Group:** Items
- **Scopes:** `com.intuit.quickbooks.accounting`
- **Endpoint Type:** Action
- **Model:** `Item`
- **Input Model:** `CreateItem`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/quickbooks/actions/create-item.ts)


## Endpoint Reference

### Request Endpoint

`POST /items`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "track_qty_onHand?": "<boolean>",
  "qty_on_hand?": "<number>",
  "name": "<string>",
  "expense_accountRef?": {
    "name?": "<string>",
    "value": "<string>"
  },
  "income_accountRef?": {
    "name?": "<string>",
    "value": "<string>"
  },
  "asset_accountRef?": {
    "name?": "<string>",
    "value": "<string>"
  },
  "inv_start_date?": "<string>",
  "unit_price_cents?": "<number>",
  "purchase_cost_cents?": "<number>",
  "type?": "<string>"
}
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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/quickbooks/actions/create-item.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/quickbooks/actions/create-item.md)

<!-- END  GENERATED CONTENT -->

