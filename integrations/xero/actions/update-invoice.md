<!-- BEGIN GENERATED CONTENT -->
# Update Invoice

## General Information

- **Description:** Updates one or more invoices in Xero. To delete an invoice
that is in DRAFT or SUBMITTED set the status to DELETED. If an
invoice has been AUTHORISED it can't be deleted but you can set
the status to VOIDED.
- **Version:** 2.0.0
- **Group:** Invoices
- **Scopes:** `accounting.transactions`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_xero_updateinvoice`
- **Input Model:** `ActionInput_xero_updateinvoice`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/xero/actions/update-invoice.ts)


## Endpoint Reference

### Request Endpoint

`PUT /invoices`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "0": {
    "type?": "<enum: 'ACCPAY' | 'ACCREC'>",
    "external_contact_id?": "<string>",
    "url?": "<string>",
    "id": "<string>",
    "issuing_date?": "<string | null>",
    "payment_due_date?": "<string | null>",
    "status?": "<string>",
    "number?": "<string>",
    "currency?": "<string>",
    "purchase_order?": "<string | null>",
    "fees": [
      {
        "account_code?": "<string>",
        "item_code?": "<string | null>",
        "account_external_id?": "<string | null>",
        "discount_amount_cents?": "<number | null>",
        "discount_rate?": "<number | null>",
        "item_id?": "<string>",
        "description?": "<string | null>",
        "units?": "<number | null>",
        "precise_unit_amount?": "<number | null>",
        "amount_cents?": "<number | null>",
        "taxes_amount_cents?": "<number | null>"
      }
    ]
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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/xero/actions/update-invoice.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/xero/actions/update-invoice.md)

<!-- END  GENERATED CONTENT -->

