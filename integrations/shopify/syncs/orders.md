<!-- BEGIN GENERATED CONTENT -->
# Orders

## General Information

- **Description:** Fetches a list of orders from Shopify.

- **Version:** 0.0.1
- **Group:** Orders
- **Scopes:** `read_customers, read_orders`
- **Endpoint Type:** Sync
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/shopify/syncs/orders.ts)


## Endpoint Reference

### Request Endpoint

`GET /orders`

### Request Query Parameters

- **modified_after:** `(optional, string)` A timestamp (e.g., `2023-05-31T11:46:13.390Z`) used to fetch records modified after this date and time. If not provided, all records are returned. The modified_after parameter is less precise than cursor, as multiple records may share the same modification timestamp.
- **limit:** `(optional, integer)` The maximum number of records to return per page. Defaults to 100.
- **cursor:** `(optional, string)` A marker used to fetch records modified after a specific point in time.If not provided, all records are returned.Each record includes a cursor value found in _nango_metadata.cursor.Save the cursor from the last record retrieved to track your sync progress.Use the cursor parameter together with the limit parameter to paginate through records.The cursor is more precise than modified_after, as it can differentiate between records with the same modification timestamp.
- **filter:** `(optional, added | updated | deleted)` Filter to only show results that have been added or updated or deleted.
- **ids:** `(optional, string[])` An array of string containing a list of your records IDs. The list will be filtered to include only the records with a matching ID.

### Request Body

_No request body_

### Request Response

```json
{
  "id": "<string>",
  "name": "<string>",
  "created_at": "<string>",
  "updated_at": "<string>",
  "processed_at": "<string>",
  "currency_code": "<string>",
  "presentment_currency_code": "<string>",
  "confirmed": "<boolean>",
  "cancelled_at": "<string | null>",
  "cancel_reason": "<string | null>",
  "closed": "<boolean>",
  "closed_at": "<string | null>",
  "fully_paid": "<boolean>",
  "customer": "<Customer | null>",
  "total_price_set": {
    "amount": "<string>",
    "currency_code": "<string>"
  },
  "subtotal_price_set": {
    "amount": "<string>",
    "currency_code": "<string>"
  },
  "total_tax_set": {
    "amount": "<string>",
    "currency_code": "<string>"
  },
  "shipping_address": "<Address | null>",
  "billing_address": "<Address | null>",
  "line_item": {
    "0": {
      "id": "<string>",
      "name": "<string>",
      "quantity": "<number>",
      "original_total_set": {
        "amount": "<string>",
        "currency_code": "<string>"
      },
      "discounted_total_set": {
        "amount": "<string>",
        "currency_code": "<string>"
      }
    }
  }
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/shopify/syncs/orders.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/shopify/syncs/orders.md)

<!-- END  GENERATED CONTENT -->

