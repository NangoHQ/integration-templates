<!-- BEGIN GENERATED CONTENT -->
# Update Credit Memo

## General Information

- **Description:** Updates a single credit memo in QuickBooks.
- **Version:** 1.0.0
- **Group:** Credit Memos
- **Scopes:** `com.intuit.quickbooks.accounting`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_quickbooks_updatecreditmemo`
- **Input Model:** `ActionInput_quickbooks_updatecreditmemo`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/quickbooks/actions/update-credit-memo.ts)


## Endpoint Reference

### Request Endpoint

`PUT /credit-memos`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "customer_ref": {
    "name?": "<string>",
    "value": "<string>"
  },
  "line": [
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
  "currency_ref": {
    "name?": "<string>",
    "value": "<string>"
  },
  "project_ref": {
    "name?": "<string>",
    "value": "<string>"
  },
  "id": "<string>",
  "sync_token": "<string>",
  "active?": "<boolean>"
}
```

### Request Response

```json
{
  "created_at": "<string>",
  "updated_at": "<string>",
  "id": "<string>",
  "txn_date": "<string>",
  "balance_cents": "<number>",
  "total_amt_cents": "<number>",
  "bill_address": "<{\"city\":\"<string | null>\",\"line1\":\"<string | null>\",\"postal_code\":\"<string | null>\",\"country\":\"<string | null>\",\"id\":\"<string>\"} | <null>>",
  "items": [
    {
      "id": "<string>",
      "description": "<string | null>",
      "qty": "<number>",
      "unit_price_cents": "<number>",
      "amount_cents": "<number>"
    }
  ],
  "remaining_credit": "<number>",
  "customer_name": "<string | null>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/quickbooks/actions/update-credit-memo.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/quickbooks/actions/update-credit-memo.md)

<!-- END  GENERATED CONTENT -->

