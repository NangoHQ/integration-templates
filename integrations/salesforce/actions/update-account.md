# Update Account

## General Information

- **Description:** Update a single account in salesforce
- **Version:** 1.0.0
- **Group:** Others
- **Scopes:**: offline_access,api
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/salesforce-sandbox/actions/update-account.ts)

## Endpoint Reference

### Request Endpoint

- **Path:** `/accounts`
- **Method:** `PATCH`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "__extends": "<CommonAccountInput, IdEntity>",
  "name?": "<string | undefined>"
}
```

### Request Response

```json
{
  "success": "<boolean>"
}
```
