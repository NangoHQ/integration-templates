<!-- BEGIN GENERATED CONTENT -->
# Create Contact

## General Information

- **Description:** Create a single contact in salesforce
- **Version:** 2.0.0
- **Group:** Contacts
- **Scopes:** `offline_access, api`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_salesforce_createcontact`
- **Input Model:** `ActionInput_salesforce_createcontact`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/salesforce/actions/create-contact.ts)


## Endpoint Reference

### Request Endpoint

`POST /contacts`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "first_name?": "<string>",
  "account_id?": "<string>",
  "owner_id?": "<string>",
  "email?": "<string>",
  "mobile?": "<string>",
  "phone?": "<string>",
  "salutation?": "<string>",
  "title?": "<string>",
  "last_name": "<string>"
}
```

### Request Response

```json
{
  "id": "<string>",
  "success": "<boolean>",
  "errors": "<unknown[]>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/salesforce/actions/create-contact.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/salesforce/actions/create-contact.md)

<!-- END  GENERATED CONTENT -->

