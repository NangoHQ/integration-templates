# Update Company

## General Information

- **Description:** Update a single company in Hubspot
- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: crm.objects.companies.write,oauth
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/hubspot/actions/update-company.ts)

## Endpoint Reference

### Request Endpoint

- **Path:** /companies
- **Method:** PATCH

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "id": "<string>",
  "__extends": {
    "name?": "<string | undefined>",
    "industry?": "<string | undefined>",
    "description?": "<string | undefined>",
    "country?": "<string | undefined>",
    "city?": "<string | undefined>",
    "lead_status?": "<string | undefined>",
    "lifecycle_stage?": "<string | undefined>",
    "owner?": "<string | undefined>",
    "year_founded?": "<string | undefined>",
    "website_url?": "<string | undefined>"
  }
}
```

### Request Response

```json
{
  "id": "<string>",
  "created_date": "<string>",
  "name?": "<string | undefined>",
  "industry?": "<string | undefined>",
  "description?": "<string | undefined>",
  "country?": "<string | undefined>",
  "city?": "<string | undefined>",
  "lead_status?": "<string | undefined>",
  "lifecycle_stage?": "<string | undefined>",
  "owner?": "<string | undefined>",
  "year_founded?": "<string | undefined>",
  "website_url?": "<string | undefined>"
}
```
