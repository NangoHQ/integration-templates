<!-- BEGIN GENERATED CONTENT -->
# Update Credit Note

## General Information

- **Description:** Updates one or more credit notes in Xero.
- **Version:** 2.0.0
- **Group:** Credit Notes
- **Scopes:** `accounting.transactions`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_xero_updatecreditnote`
- **Input Model:** `ActionInput_xero_updatecreditnote`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/xero/actions/update-credit-note.ts)


## Endpoint Reference

### Request Endpoint

`PUT /credit-notes`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "0": {
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
        "item_code?": "<string | null>",
        "description?": "<string | null>",
        "units?": "<number | null>",
        "precise_unit_amount?": "<number | null>",
        "account_code?": "<string | null>",
        "account_external_id?": "<string | null>",
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
          "item_code?": "<string | null>",
          "description?": "<string | null>",
          "units?": "<number | null>",
          "precise_unit_amount?": "<number | null>",
          "account_code?": "<string | null>",
          "account_external_id?": "<string | null>",
          "amount_cents?": "<number | null>",
          "taxes_amount_cents?": "<number | null>"
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
          "item_code?": "<string | null>",
          "description?": "<string | null>",
          "units?": "<number | null>",
          "precise_unit_amount?": "<number | null>",
          "account_code?": "<string | null>",
          "account_external_id?": "<string | null>",
          "amount_cents?": "<number | null>",
          "taxes_amount_cents?": "<number | null>"
        }
      ],
      "validation_errors": "<unknown[]>"
    }
  ]
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/xero/actions/update-credit-note.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/xero/actions/update-credit-note.md)

<!-- END  GENERATED CONTENT -->

