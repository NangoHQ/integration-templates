# Opportunities

## General Information
- **Description:** Fetches a list of opportunities from salesforce

- **Version:** 1.0.0
- **Group:** Others
- **Scopes:**: offline_access,api
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/salesforce-sandbox/syncs/opportunities.ts)

### Request Endpoint

- **Path:** `/opportunities`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

### Request Response

```json
{
  "id": "<string>",
  "opportunity_name": "<string>",
  "account_name": "<string | null>",
  "account_id": "<string | null>",
  "amount": "<number | null>",
  "description": "<string | null>",
  "close_date": "<string>",
  "created_by_id": "<string>",
  "created_by": "<string>",
  "owner_id": "<string>",
  "owner_name": "<string>",
  "stage": "<string>",
  "probability": "<number | null>",
  "type": "<string | null>",
  "last_modified_date": "<string>"
}
```

## Changelog


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/salesforce-sandbox/syncs/opportunities.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/salesforce-sandbox/syncs/opportunities.md)

<!-- END  GENERATED CONTENT -->



undefined