# Create Customer

## General Information

- **Description:** Creates a single customer in QuickBooks.

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: com.intuit.quickbooks.accounting
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/quickbooks-sandbox/actions/create-customer.ts)

## Endpoint Reference

### Request Endpoint

- **Path:** `/customers`
- **Method:** `POST`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "display_name?": "<string>",
  "suffix?": "<string>",
  "title?": "<string>",
  "given_name?": "<string>",
  "company_name?": "<string>",
  "notes?": "<string>",
  "primary_email?": "<string>",
  "primary_phone?": "<string>",
  "bill_address?": {
    "line1?": "<string>",
    "line2?": "<string>",
    "city?": "<string>",
    "postal_code?": "<string>",
    "country?": "<string>",
    "lat?": "<string>",
    "long?": "<string>"
  },
  "ship_address?": {
    "line1?": "<string>",
    "line2?": "<string>",
    "city?": "<string>",
    "postal_code?": "<string>",
    "country?": "<string>",
    "lat?": "<string>",
    "long?": "<string>"
  }
}
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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/quickbooks-sandbox/actions/create-customer.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/quickbooks-sandbox/actions/create-customer.md)
