<!-- BEGIN GENERATED CONTENT -->
# Create Invoice

## General Information

- **Description:** Creates one or more invoices in Xero.
Note: Does NOT check if the invoice already exists.
- **Version:** 2.0.0
- **Group:** Invoices
- **Scopes:** `accounting.transactions`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_xero_createinvoice`
- **Input Model:** `ActionInput_xero_createinvoice`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/xero/actions/create-invoice.ts)


## Endpoint Reference

### Request Endpoint

`POST /invoices`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "0": {
    "type": "<enum: 'ACCPAY' | 'ACCREC'>",
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
    "issuing_date?": "<Date>",
    "payment_due_date?": "<<Date> | <null>>",
    "status?": "<string>",
    "number?": "<string>",
    "currency?": "<string>",
    "purchase_order?": "<string | null>"
  }
}
```

### Request Response

```json
{
  "succeededInvoices": [
    {
      "type": "<enum: 'ACCPAY' | 'ACCREC'>",
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
      "type": "<enum: 'ACCPAY' | 'ACCREC'>",
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
      ],
      "validation_errors": "<unknown[]>"
    }
  ]
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/xero/actions/create-invoice.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/xero/actions/create-invoice.md)

<!-- END  GENERATED CONTENT -->

