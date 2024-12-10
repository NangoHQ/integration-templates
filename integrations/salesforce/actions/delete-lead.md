# Delete Lead

## General Information

- **Description:** Delete a single lead in salesforce
- **Version:** 1.0.0
- **Group:** Others
- **Scopes:**: offline_access,api
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/salesforce-sandbox/actions/delete-lead.ts)

## Endpoint Reference

### Request Endpoint

- **Path:** `/leads`
- **Method:** `DELETE`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "id": "<string>"
}
```

### Request Response

```json
{
  "success": "<boolean>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/salesforce-sandbox/actions/delete-lead.ts)
-- [ReadMe History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/salesforce-sandbox/actions/delete-lead.md)
