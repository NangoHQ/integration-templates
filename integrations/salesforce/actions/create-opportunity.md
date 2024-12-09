# Create Opportunity

## General Information

- **Description:** Create a single opportunity in salesforce
- **Version:** 1.0.0
- **Group:** Others
- **Scopes:**: offline_access,api
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/salesforce-sandbox/actions/create-opportunity.ts)

## Endpoint Reference

### Request Endpoint

- **Path:** /opportunities
- **Method:** POST

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "__extends": {
    "account_id?": "<string | undefined>",
    "amount?": "<number | undefined>",
    "description?": "<string | undefined>",
    "created_by_id?": "<string | undefined>",
    "owner_id?": "<string | undefined>",
    "probability?": "<number | undefined>",
    "type?": "<string | undefined>"
  },
  "opportunity_name": "<string>",
  "close_date": "<string>",
  "stage": "<string>"
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
