<!-- BEGIN GENERATED CONTENT -->
# Create Contact

## General Information

- **Description:** Creates one or multiple contacts in Xero.
Note: Does NOT check if these contacts already exist.
- **Version:** 2.0.0
- **Group:** Contacts
- **Scopes:** `accounting.contacts`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_xero_createcontact`
- **Input Model:** `ActionInput_xero_createcontact`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/xero/actions/create-contact.ts)


## Endpoint Reference

### Request Endpoint

`POST /contacts`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "0": {
    "name": "<string>",
    "external_id?": "<string>",
    "email?": "<string>",
    "tax_number?": "<string>",
    "address_line_1?": "<string>",
    "address_line_2?": "<string>",
    "city?": "<string>",
    "zip?": "<string>",
    "country?": "<string>",
    "state?": "<string>",
    "phone?": "<string>"
  }
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
      "subsidiary?": "<string | null>",
      "validation_errors": "<unknown[]>"
    }
  ]
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/xero/actions/create-contact.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/xero/actions/create-contact.md)

<!-- END  GENERATED CONTENT -->

