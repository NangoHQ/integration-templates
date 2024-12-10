# Invoices

## General Information
- **Description:** Fetches all invoices in QuickBooks. Handles both active and voided invoices, saving or deleting them based on their status.

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: com.intuit.quickbooks.accounting
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/quickbooks-sandbox/syncs/invoices.ts)

### Request Endpoint

- **Path:** `/invoices`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

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


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/quickbooks-sandbox/syncs/invoices.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/quickbooks-sandbox/syncs/invoices.md)

<!-- END  GENERATED CONTENT -->



undefined