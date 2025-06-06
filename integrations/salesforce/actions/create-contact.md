<!-- BEGIN GENERATED CONTENT -->
# Create Contact

## General Information

- **Description:** Create a single contact in salesforce
- **Version:** 1.0.2
- **Group:** Contacts
- **Scopes:** `offline_access, api`
- **Endpoint Type:** Action
- **Model:** `ActionResponse`
- **Input Model:** `CreateContactInput`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/salesforce/actions/create-contact.ts)


## Endpoint Reference

### Request Endpoint

`POST /contacts`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "first_name?": "<string | undefined>",
  "account_id?": "<string | undefined>",
  "owner_id?": "<string | undefined>",
  "email?": "<string | undefined>",
  "mobile?": "<string | undefined>",
  "phone?": "<string | undefined>",
  "salutation?": "<string | undefined>",
  "title?": "<string | undefined>",
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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/salesforce/actions/create-contact.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/salesforce/actions/create-contact.md)

<!-- END  GENERATED CONTENT -->

