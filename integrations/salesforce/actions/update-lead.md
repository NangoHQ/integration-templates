<!-- BEGIN GENERATED CONTENT -->
# Update Lead

## General Information

- **Description:** Update a single lead in salesforce
- **Version:** 2.0.0
- **Group:** Leads
- **Scopes:** `offline_access, api`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_salesforce_updatelead`
- **Input Model:** `ActionInput_salesforce_updatelead`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/salesforce/actions/update-lead.ts)


## Endpoint Reference

### Request Endpoint

`PATCH /leads`

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
  "id": "<string>",
  "last_name?": "<string>",
  "company_name?": "<string>"
}
```

### Request Response

```json
{
  "success": "<boolean>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/salesforce/actions/update-lead.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/salesforce/actions/update-lead.md)

<!-- END  GENERATED CONTENT -->

