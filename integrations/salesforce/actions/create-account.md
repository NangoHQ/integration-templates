# Create Account

## General Information

- **Description:** Create a single account in salesforce
- **Version:** 1.0.0
- **Group:** Others
- **Scopes:**: offline_access,api
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/salesforce-sandbox/actions/create-account.ts)

## Endpoint Reference

### Request Endpoint

- **Path:** `/accounts`
- **Method:** `POST`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "description?": "<string | undefined>",
  "website?": "<string | undefined>",
  "industry?": "<string | undefined>",
  "billing_city?": "<string | undefined>",
  "billing_country?": "<string | undefined>",
  "owner_id?": "<string | undefined>",
  "name": "<string>"
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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/salesforce-sandbox/actions/create-account.ts)
-- [ReadMe History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/salesforce-sandbox/actions/create-account.md)
