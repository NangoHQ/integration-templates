<!-- BEGIN GENERATED CONTENT -->
# Create Ephemeral Transaction

## General Information

- **Description:** Creates an ephemeral transaction in Anrok.
- **Version:** 1.0.0
- **Group:** Others
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `ActionOutput_anrok_createephemeraltransaction`
- **Input Model:** `ActionInput_anrok_createephemeraltransaction`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/anrok/actions/create-ephemeral-transaction.ts)


## Endpoint Reference

### Request Endpoint

`POST /ephmeral-transactions`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "id?": "<string>",
  "issuing_date": "<string>",
  "currency": "<string>",
  "contact": {
    "external_id": "<string>",
    "name": "<string>",
    "address_line_1": "<string>",
    "city": "<string>",
    "zip": "<string>",
    "country": "<string>",
    "taxable": "<boolean>",
    "tax_number": "<string>"
  },
  "fees": [
    {
      "item_id": "<string>",
      "item_code": "<string | null>",
      "amount_cents": "<number | null>"
    }
  ]
}
```

### Request Response

```json
{
  "succeeded": [
    {
      "id?": "<string>",
      "issuing_date": "<string>",
      "currency": "<string>",
      "contact": {
        "external_id": "<string>",
        "name": "<string>",
        "address_line_1": "<string>",
        "city": "<string>",
        "zip": "<string>",
        "country": "<string>",
        "taxable": "<boolean>",
        "tax_number": "<string>"
      },
      "fees": [
        {
          "item_id": "<string>",
          "item_code": "<string | null>",
          "amount_cents": "<number | null>"
        }
      ],
      "sub_total_excluding_taxes?": "<number>",
      "taxes_amount_cents?": "<number>"
    }
  ],
  "failed": [
    {
      "id?": "<string>",
      "issuing_date": "<string>",
      "currency": "<string>",
      "contact": {
        "external_id": "<string>",
        "name": "<string>",
        "address_line_1": "<string>",
        "city": "<string>",
        "zip": "<string>",
        "country": "<string>",
        "taxable": "<boolean>",
        "tax_number": "<string>"
      },
      "fees": [
        {
          "item_id": "<string>",
          "item_code": "<string | null>",
          "amount_cents": "<number | null>"
        }
      ],
      "validation_errors?": "<unknown>"
    }
  ]
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/anrok/actions/create-ephemeral-transaction.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/anrok/actions/create-ephemeral-transaction.md)

<!-- END  GENERATED CONTENT -->

