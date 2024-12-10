# Create Contact

## General Information

- **Description:** Create a single contact in salesforce
- **Version:** 1.0.1
- **Group:** Others
- **Scopes:**: offline_access,api
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/salesforce-sandbox/actions/create-contact.ts)

## Endpoint Reference

### Request Endpoint

- **Path:** `/contacts`
- **Method:** `POST`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "__extends": {
    "first_name?": "<string | undefined>",
    "account_id?": "<string | undefined>",
    "owner_id?": "<string | undefined>",
    "email?": "<string | undefined>",
    "mobile?": "<string | undefined>",
    "phone?": "<string | undefined>",
    "salutation?": "<string | undefined>",
    "title?": "<string | undefined>"
  },
  "last_name": "<string>"
}
```

### Request Response

```json
{
  "id": "<string>",
  "success": "<boolean>",
  "errors": "<array>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/salesforce-sandbox/actions/create-contact.ts)
-- [ReadMe History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/salesforce-sandbox/actions/create-contact.md)
