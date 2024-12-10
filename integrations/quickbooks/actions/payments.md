# Payments

## General Information
- **Description:** Fetches all payments in QuickBooks. Handles both active and voided payments, saving or deleting them based on their status.

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: com.intuit.quickbooks.accounting
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/quickbooks-sandbox/syncs/payments.ts)

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
  "created_at": "<string>",
  "updated_at": "<string>",
  "id": "<string>",
  "amount_cents": "<number>",
  "customer_name": "<string | null>",
  "txn_date": "<string>"
}
```

## Changelog


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/quickbooks-sandbox/syncs/payments.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/quickbooks-sandbox/syncs/payments.md)

<!-- END  GENERATED CONTENT -->



undefined