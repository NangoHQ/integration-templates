<!-- BEGIN GENERATED CONTENT -->
# Update Contact

## General Information

- **Description:** Updates one or multiple contacts in Xero. Only fields that are passed in are modified. If a field should not be changed, omit it in the input. The id field is mandatory.

- **Version:** 1.0.3
- **Group:** Contacts
- **Scopes:** `accounting.contacts`
- **Endpoint Type:** Action
- **Model:** `ContactActionResponse`
- **Input Model:** `Contact[]`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/xero/actions/update-contact.ts)


## Endpoint Reference

### Request Endpoint

`PUT /contacts`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "input": [
    {
      "name": "<string>",
      "id": "<string>",
      "external_id": "<string | null>",
      "email": "<string | null>",
      "tax_number": "<string | null>",
      "address_line_1?": "<string | null>",
      "address_line_2?": "<string | null>",
      "city": "<string | null>",
      "zip": "<string | null>",
      "country": "<string | null>",
      "state": "<string | null>",
      "phone": "<string | null>",
      "subsidiary?": "<string | null>"
    }
  ]
}
```

### Request Response

```json
{
  "succeededContacts": [
    {
      "name": "<string>",
      "id": "<string>",
      "external_id": "<string | null>",
      "email": "<string | null>",
      "tax_number": "<string | null>",
      "address_line_1?": "<string | null>",
      "address_line_2?": "<string | null>",
      "city": "<string | null>",
      "zip": "<string | null>",
      "country": "<string | null>",
      "state": "<string | null>",
      "phone": "<string | null>",
      "subsidiary?": "<string | null>"
    }
  ],
  "failedContacts": [
    {
      "id": "<string>",
      "external_id": "<string | null>",
      "email": "<string | null>",
      "tax_number": "<string | null>",
      "address_line_1?": "<string | null>",
      "address_line_2?": "<string | null>",
      "city": "<string | null>",
      "zip": "<string | null>",
      "country": "<string | null>",
      "state": "<string | null>",
      "phone": "<string | null>",
      "subsidiary?": "<string | null>",
      "validation_errors": [
        "<any>"
      ]
    }
  ]
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/xero/actions/update-contact.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/xero/actions/update-contact.md)

<!-- END  GENERATED CONTENT -->

