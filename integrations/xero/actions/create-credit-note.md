<!-- BEGIN GENERATED CONTENT -->
# Create Credit Note

## General Information

- **Description:** Creates one or more credit notes in Xero.
Note: Does NOT check if the credit note already exists.

- **Version:** 1.0.4
- **Group:** Credit Notes
- **Scopes:** `accounting.transactions`
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/xero/actions/create-credit-note.ts)


## Endpoint Reference

### Request Endpoint

`POST /credit-notes`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "input": [
    {
      "id": "<string>",
      "type": "<string>",
      "external_contact_id": "<string>",
      "status": "<string>",
      "number": "<string>",
      "is_taxable?": "<boolean>",
      "tax_rate_id?": "<string>",
      "tax_rate?": "<number>",
      "currency": "<string>",
      "reference": "<string>",
      "issuing_date": "<string | null>",
      "fees": [
        {
          "item_id": "<string>",
          "item_code": "<string>",
          "description": "<string>",
          "units": "<number>",
          "precise_unit_amount": "<number>",
          "account_code": "<string>",
          "account_external_id": "<string>",
          "amount_cents": "<number>",
          "taxes_amount_cents": "<number>"
        }
      ]
    }
  ]
}
```

### Request Response

```json
{
  "succeededCreditNotes": [
    {
      "id": "<string>",
      "type": "<string>",
      "external_contact_id": "<string>",
      "status": "<string>",
      "number": "<string>",
      "is_taxable?": "<boolean>",
      "tax_rate_id?": "<string>",
      "tax_rate?": "<number>",
      "currency": "<string>",
      "reference": "<string>",
      "issuing_date": "<string | null>",
      "fees": [
        {
          "item_id": "<string>",
          "item_code": "<string>",
          "description": "<string>",
          "units": "<number>",
          "precise_unit_amount": "<number>",
          "account_code": "<string>",
          "account_external_id": "<string>",
          "amount_cents": "<number>",
          "taxes_amount_cents": "<number>"
        }
      ]
    }
  ],
  "failedCreditNotes": [
    {
      "id": "<string>",
      "type": "<string>",
      "external_contact_id": "<string>",
      "status": "<string>",
      "number": "<string>",
      "is_taxable?": "<boolean>",
      "tax_rate_id?": "<string>",
      "tax_rate?": "<number>",
      "currency": "<string>",
      "reference": "<string>",
      "issuing_date": "<string | null>",
      "fees": [
        {
          "item_id": "<string>",
          "item_code": "<string>",
          "description": "<string>",
          "units": "<number>",
          "precise_unit_amount": "<number>",
          "account_code": "<string>",
          "account_external_id": "<string>",
          "amount_cents": "<number>",
          "taxes_amount_cents": "<number>"
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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/xero/actions/create-credit-note.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/xero/actions/create-credit-note.md)

<!-- END  GENERATED CONTENT -->

