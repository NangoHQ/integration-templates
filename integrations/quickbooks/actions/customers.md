# Customers

## General Information
- **Description:** Fetches all QuickBooks customers. Handles both active and archived customers, saving or deleting them based on their status.

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: com.intuit.quickbooks.accounting
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/quickbooks-sandbox/syncs/customers.ts)

### Request Endpoint

- **Path:** `/customers`
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
  "given_name": "<string | null>",
  "display_name": "<string | null>",
  "active": "<boolean>",
  "balance_cents": "<number>",
  "taxable": "<boolean>",
  "primary_email": "<string | null>",
  "primary_phone": "<string | null>",
  "bill_address": "<BillAddr | null>",
  "ship_address": "<BillAddr | null>"
}
```

## Changelog


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/quickbooks-sandbox/syncs/customers.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/quickbooks-sandbox/syncs/customers.md)

<!-- END  GENERATED CONTENT -->



undefined