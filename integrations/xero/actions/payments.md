# Payments

## General Information
- **Description:** Fetches all payments in Xero. Incremental sync.

- **Version:** 1.0.2
- **Group:** Others
- **Scopes:**: accounting.transactions
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/xero/syncs/payments.ts)

### Request Endpoint

- **Path:** `/payments`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

### Request Response

```json
{
  "date": "<string | null>",
  "amount_cents": "<number>",
  "external_contact_id?": "<string>",
  "account_code?": "<string>",
  "account_id?": "<string>",
  "id": "<string>",
  "status": "<string>",
  "invoice_id": "<string | null>",
  "credit_note_id": "<string | null>"
}
```

## Changelog


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/xero/syncs/payments.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/xero/syncs/payments.md)

<!-- END  GENERATED CONTENT -->

undefined