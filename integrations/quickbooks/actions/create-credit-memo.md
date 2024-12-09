# Create Credit Memo

## General Information

- **Description:** Creates a single credit memo in QuickBooks.

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: com.intuit.quickbooks.accounting
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/quickbooks-sandbox/actions/create-credit-memo.ts)

## Endpoint Reference

### Request Endpoint

- **Path:** `/credit-memos`
- **Method:** `POST`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "__extends": {
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
}
```

### Request Response

```json
{
  "__extends": {
    "__extends": {
      "created_at": "<string>",
      "updated_at": "<string>"
    },
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
    ]
  },
  "remaining_credit": "<number>",
  "customer_name": "<string | null>"
}
```
