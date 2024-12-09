# Create Payment

## General Information

- **Description:** Creates a single payment in QuickBooks.

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: com.intuit.quickbooks.accounting
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/quickbooks-sandbox/actions/create-payment.ts)

## Endpoint Reference

### Request Endpoint

- **Path:** /payments
- **Method:** POST

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
  "__extends": {
    "created_at": "<string>",
    "updated_at": "<string>"
  },
  "id": "<string>",
  "amount_cents": "<number>",
  "customer_name": "<string | null>",
  "txn_date": "<string>"
}
```
