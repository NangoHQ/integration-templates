# Create Payment

## General Information

- **Description:** Creates one or more payments in Xero.
Note: Does NOT check if the payment already exists.

- **Version:** 1.0.2
- **Group:** Others
- **Scopes:**: accounting.transactions
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/xero/actions/create-payment.ts)

## Endpoint Reference

### Request Endpoint

- **Path:** /payments
- **Method:** POST

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "input": [
    {
      "__extends": {
        "date": "<string | null>",
        "amount_cents": "<number>",
        "external_contact_id?": "<string>",
        "account_code?": "<string>",
        "account_id?": "<string>"
      },
      "status?": "<string>",
      "invoice_id?": "<string>",
      "credit_note_id?": "<string>"
    }
  ]
}
```

### Request Response

```json
{
  "succeededPayment": [
    {
      "__extends": {
        "date": "<string | null>",
        "amount_cents": "<number>",
        "external_contact_id?": "<string>",
        "account_code?": "<string>",
        "account_id?": "<string>"
      },
      "id": "<string>",
      "status": "<string>",
      "invoice_id": "<string | null>",
      "credit_note_id": "<string | null>"
    }
  ],
  "failedPayments": [
    {
      "__extends": {
        "__extends": {
          "date": "<string | null>",
          "amount_cents": "<number>",
          "external_contact_id?": "<string>",
          "account_code?": "<string>",
          "account_id?": "<string>"
        },
        "id": "<string>",
        "status": "<string>",
        "invoice_id": "<string | null>",
        "credit_note_id": "<string | null>"
      },
      "validation_errors": [
        "<any>"
      ]
    }
  ]
}
```
