# Accounts

## General Information
- **Description:** Fetches a list of accounts from salesforce

- **Version:** 1.0.2
- **Group:** Others
- **Scopes:**: _None_
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/salesforce-sandbox/syncs/accounts.ts)

### Request Endpoint

- **Path:** `/accounts`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

### Request Response

```json
{
  "id": "<string>",
  "name": "<string>",
  "description": "<string | null>",
  "website": "<string | null>",
  "industry": "<string | null>",
  "billing_city": "<string | null>",
  "billing_country": "<string | null>",
  "owner_id": "<string>",
  "owner_name": "<string>",
  "last_modified_date": "<string>"
}
```

## Changelog


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/salesforce-sandbox/syncs/accounts.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/salesforce-sandbox/syncs/accounts.md)

<!-- END  GENERATED CONTENT -->



undefined