<!-- BEGIN GENERATED CONTENT -->
# Create Lead

## General Information

- **Description:** Create a single lead in salesforce
- **Version:** 1.0.1
- **Group:** Leads
- **Scopes:** `offline_access, api`
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/salesforce/actions/create-lead.ts)


## Endpoint Reference

### Request Endpoint

`POST /leads`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "first_name?": "<string | undefined>",
  "email?": "<string | undefined>",
  "owner_id?": "<string | undefined>",
  "phone?": "<string | undefined>",
  "salutation?": "<string | undefined>",
  "title?": "<string | undefined>",
  "website?": "<string | undefined>",
  "industry?": "<string | undefined>",
  "last_name": "<string>",
  "company_name": "<string>"
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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/salesforce/actions/create-lead.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/salesforce/actions/create-lead.md)

<!-- END  GENERATED CONTENT -->

