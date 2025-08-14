<!-- BEGIN GENERATED CONTENT -->
# Create Lead

## General Information

- **Description:** Create a single lead in salesforce
- **Version:** 2.0.0
- **Group:** Leads
- **Scopes:** `offline_access, api`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_salesforce_createlead`
- **Input Model:** `ActionInput_salesforce_createlead`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/salesforce/actions/create-lead.ts)


## Endpoint Reference

### Request Endpoint

`POST /leads`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "first_name?": "<string>",
  "email?": "<string>",
  "owner_id?": "<string>",
  "phone?": "<string>",
  "salutation?": "<string>",
  "title?": "<string>",
  "website?": "<string>",
  "industry?": "<string>",
  "last_name": "<string>",
  "company_name": "<string>"
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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/salesforce/actions/create-lead.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/salesforce/actions/create-lead.md)

<!-- END  GENERATED CONTENT -->

