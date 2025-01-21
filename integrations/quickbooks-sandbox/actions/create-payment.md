<!-- BEGIN GENERATED CONTENT -->
# Create Payment

## General Information

- **Description:** Creates a single payment in QuickBooks.

- **Version:** 0.0.1
- **Group:** Payments
- **Scopes:** `com.intuit.quickbooks.accounting`
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/quickbooks-sandbox/actions/create-payment.ts)


## Endpoint Reference

### Request Endpoint

`POST /payments`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "total_amount_cents": "<number>",
  "customer_ref": {
    "name?": "<string>",
    "value": "<string>"
  },
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
  "created_at": "<string | null>",
  "updated_at": "<string>",
  "id": "<string>",
  "amount_cents": "<number>",
  "customer_name": "<string | null>",
  "txn_date": "<string | null>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/quickbooks-sandbox/actions/create-payment.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/quickbooks-sandbox/actions/create-payment.md)

<!-- END  GENERATED CONTENT -->

