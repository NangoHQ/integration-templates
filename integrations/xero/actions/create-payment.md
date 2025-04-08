<!-- BEGIN GENERATED CONTENT -->
# Create Payment

## General Information

- **Description:** Creates one or more payments in Xero.
Note: Does NOT check if the payment already exists.

- **Version:** 1.0.3
- **Group:** Payments
- **Scopes:** `accounting.transactions`
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/xero/actions/create-payment.ts)


## Endpoint Reference

### Request Endpoint

`POST /payments`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "input": [
    {
      "date": "<string | null>",
      "amount_cents": "<number>",
      "external_contact_id?": "<string>",
      "account_code?": "<string>",
      "account_id?": "<string>",
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
  ],
  "failedPayments": [
    {
      "id": "<string>",
      "status": "<string>",
      "invoice_id": "<string | null>",
      "credit_note_id": "<string | null>",
      "validation_errors": [
        "<any>"
      ]
    }
  ]
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/xero/actions/create-payment.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/xero/actions/create-payment.md)

<!-- END  GENERATED CONTENT -->

