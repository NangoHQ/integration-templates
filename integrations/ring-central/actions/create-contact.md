<!-- BEGIN GENERATED CONTENT -->
# Create Contact

## General Information

- **Description:** Creates a new external contact in RingCentral.

- **Version:** 0.0.1
- **Group:** Contacts
- **Scopes:** `Contacts`
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/ring-central/actions/create-contact.ts)


## Endpoint Reference

### Request Endpoint

`POST /contacts`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "firstName?": "<string>",
  "lastName?": "<string>",
  "email?": "<string>",
  "phoneNumbers?": [
    {
      "type": "<work | mobile | other>",
      "value": "<string>"
    }
  ],
  "company?": "<string>",
  "jobTitle?": "<string>",
  "notes?": "<string>"
}
```

### Request Response

```json
{
  "id": "<string>",
  "firstName": "<string | undefined>",
  "lastName": "<string | undefined>",
  "email": "<string | undefined>",
  "phoneNumbers?": "<PhoneNumber[] | undefined>",
  "company": "<string | undefined>",
  "jobTitle": "<string | undefined>",
  "notes": "<string | undefined>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/ring-central/actions/create-contact.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/ring-central/actions/create-contact.md)

<!-- END  GENERATED CONTENT -->

