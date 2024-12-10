# Create Invoice

## General Information

- **Description:** Creates one or more invoices in Xero.
Note: Does NOT check if the invoice already exists.

- **Version:** 1.0.3
- **Group:** Others
- **Scopes:**: accounting.transactions
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/xero/actions/create-invoice.ts)

## Endpoint Reference

### Request Endpoint

- **Path:** `/invoices`
- **Method:** `POST`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "input": [
    {
      "type": "<ACCPAY | ACCREC>",
      "external_contact_id": "<string>",
      "url?": "<string>",
      "fees": [
        {
          "account_code?": "<string>",
          "item_code?": "<string | null>",
          "account_external_id?": "<string | null>",
          "discount_amount_cents?": "<number | null>",
          "discount_rate?": "<number | null>",
          "item_id?": "<string>",
          "description": "<string>",
          "units?": "<number>",
          "precise_unit_amount?": "<number | null>",
          "amount_cents?": "<number | null>",
          "taxes_amount_cents?": "<number | null>"
        }
      ],
      "issuing_date?": "<date>",
      "payment_due_date?": "<date | null>",
      "status?": "<string>",
      "number?": "<string>",
      "currency?": "<string>",
      "purchase_order?": "<string | null>"
    }
  ]
}
```

### Request Response

```json
{
  "succeededInvoices": [
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
  ],
  "failedInvoices": [
    {
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
      ],
      "validation_errors": [
        "<any>"
      ]
    }
  ]
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/xero/actions/create-invoice.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/xero/actions/create-invoice.md)
