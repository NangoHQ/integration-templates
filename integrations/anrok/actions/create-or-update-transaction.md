# Create Or Update Transaction

## General Information

- **Description:** Creates or updates a transaction in Anrok.

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: _None_
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/anrok/actions/create-or-update-transaction.ts)

## Endpoint Reference

### Request Endpoint

- **Path:** `/transactions`
- **Method:** `POST`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "input": [
    {
      "__extends": {
        "id?": "<string | undefined>",
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
        }
      },
      "fees": [
        {
          "item_id": "<string>",
          "item_code": "<string | null>",
          "amount_cents": "<number | null>"
        }
      ]
    }
  ]
}
```

### Request Response

```json
{
  "succeeded": [
    {
      "__extends": {
        "__extends": {
          "id?": "<string | undefined>",
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
          }
        },
        "fees": [
          {
            "item_id": "<string>",
            "item_code": "<string | null>",
            "amount_cents": "<number | null>"
          }
        ]
      },
      "sub_total_excluding_taxes?": "<number>",
      "taxes_amount_cents?": "<number>"
    }
  ],
  "failed": [
    {
      "__extends": {
        "__extends": {
          "id?": "<string | undefined>",
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
          }
        },
        "fees": [
          {
            "item_id": "<string>",
            "item_code": "<string | null>",
            "amount_cents": "<number | null>"
          }
        ]
      },
      "validation_errors": "<any>"
    }
  ]
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/anrok/actions/create-or-update-transaction.ts)
-- [ReadMe History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/anrok/actions/create-or-update-transaction.md)
