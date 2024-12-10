# Invoices

## General Information
- **Description:** Fetches all invoices in Xero. Incremental sync.

- **Version:** 1.0.2
- **Group:** Others
- **Scopes:**: accounting.transactions
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/xero/syncs/invoices.ts)

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
  "type": "<ACCPAY | ACCREC>",
  "external_contact_id": "<string>",
  "url?": "<string>",
  "id": "<string>",
  "issuing_date": "<string | null>",
  "payment_due_date": "<string | null>",
  "status": "<string>",
  "number?": "<string>",
  "currency": "<string>",
  "purchase_order": "<string | null>",
  "fees": [
    {
      "account_code?": "<string>",
      "item_code?": "<string | null>",
      "account_external_id?": "<string | null>",
      "discount_amount_cents?": "<number | null>",
      "discount_rate?": "<number | null>",
      "item_id": "<string>",
      "description": "<string | null>",
      "units": "<number | null>",
      "precise_unit_amount": "<number | null>",
      "amount_cents": "<number | null>",
      "taxes_amount_cents": "<number | null>"
    }
  ]
}
```

## Changelog


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/xero/syncs/invoices.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/xero/syncs/invoices.md)

<!-- END  GENERATED CONTENT -->

undefined