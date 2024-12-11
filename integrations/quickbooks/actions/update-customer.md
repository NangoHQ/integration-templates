# Update Customer

## General Information

- **Description:** Update a single customer in QuickBooks.

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:** `com.intuit.quickbooks.accounting`
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/quickbooks-sandbox/actions/update-customer.ts)


## Endpoint Reference

### Request Endpoint

- **Path:** `/customers`
- **Method:** `PUT`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{}
```

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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/quickbooks-sandbox/actions/update-customer.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/quickbooks-sandbox/actions/update-customer.md)

<!-- END  GENERATED CONTENT -->

