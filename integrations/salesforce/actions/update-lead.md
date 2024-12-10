# Update Lead

## General Information

- **Description:** Update a single lead in salesforce
- **Version:** 1.0.1
- **Group:** Others
- **Scopes:**: offline_access,api
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/salesforce-sandbox/actions/update-lead.ts)

## Endpoint Reference

### Request Endpoint

- **Path:** `/leads`
- **Method:** `PATCH`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "last_name?": "<string | undefined>",
  "company_name?": "<string | undefined>"
}
```

### Request Response

```json
{
  "success": "<boolean>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/salesforce-sandbox/actions/update-lead.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/salesforce-sandbox/actions/update-lead.md)
