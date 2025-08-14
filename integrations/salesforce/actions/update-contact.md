<!-- BEGIN GENERATED CONTENT -->
# Update Contact

## General Information

- **Description:** Update a single contact in salesforce
- **Version:** 2.0.0
- **Group:** Contacts
- **Scopes:** `offline_access, api`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_salesforce_updatecontact`
- **Input Model:** `ActionInput_salesforce_updatecontact`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/salesforce/actions/update-contact.ts)


## Endpoint Reference

### Request Endpoint

`PATCH /contacts`

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
  "id": "<string>",
  "last_name?": "<string>"
}
```

### Request Response

```json
{
  "success": "<boolean>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/salesforce/actions/update-contact.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/salesforce/actions/update-contact.md)

<!-- END  GENERATED CONTENT -->

