# Create Invoice

## General Information

- **Description:** Creates a single invoice in QuickBooks.

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: com.intuit.quickbooks.accounting
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/quickbooks-sandbox/actions/create-invoice.ts)

## Endpoint Reference

### Request Endpoint

- **Path:** `/invoices`
- **Method:** `POST`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "customer_ref?": {
    "name?": "<string>",
    "value": "<string>"
  },
  "line?": [
    {
      "detail_type": "<string>",
      "amount_cents": "<number>",
      "sales_item_line_detail": {
        "item_ref": {
          "name?": "<string>",
          "value": "<string>"
        }
      },
      "quantity?": "<number>",
      "unit_price_cents?": "<number>",
      "discount_rate?": "<number>",
      "description?": "<string>"
    }
  ],
  "due_date?": "<string>",
  "currency_ref?": {
    "name?": "<string>",
    "value": "<string>"
  },
  "project_ref?": {
    "name?": "<string>",
    "value": "<string>"
  }
}
```

### Request Response

```json
{
  "id": "<string>",
  "txn_date": "<string>",
  "balance_cents": "<number>",
  "total_amt_cents": "<number>",
  "bill_address": "<BillAddr | null>",
  "items": [
    {
      "id": "<string>",
      "description": "<string | null>",
      "qty": "<number>",
      "unit_price_cents": "<number>",
      "amount_cents": "<number>"
    }
  ],
  "due_date": "<string>",
  "deposit_cents": "<number>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/quickbooks-sandbox/actions/create-invoice.ts)
-- [ReadMe History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/quickbooks-sandbox/actions/create-invoice.md)
