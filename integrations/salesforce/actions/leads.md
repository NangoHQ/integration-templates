# Leads

## General Information
- **Description:** Fetches a list of leads from salesforce

- **Version:** 1.0.1
- **Group:** Others
- **Scopes:**: offline_access,api
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/salesforce-sandbox/syncs/leads.ts)

### Request Endpoint

- **Path:** `/leads`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

### Request Response

```json
{
  "id": "<string>",
  "first_name": "<string | null>",
  "last_name": "<string>",
  "company_name": "<string>",
  "email": "<string | null>",
  "owner_id": "<string>",
  "owner_name": "<string>",
  "phone": "<string | null>",
  "salutation": "<string | null>",
  "title": "<string | null>",
  "website": "<string | null>",
  "industry": "<string | null>",
  "last_modified_date": "<string>"
}
```

## Changelog


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/salesforce-sandbox/syncs/leads.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/salesforce-sandbox/syncs/leads.md)

<!-- END  GENERATED CONTENT -->



undefined