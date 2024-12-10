# Companies

## General Information
- **Description:** Fetches a list of companies from Hubspot

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: crm.objects.companies.read,oauth
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/hubspot/syncs/companies.ts)

### Request Endpoint

- **Path:** `/companies`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

### Request Response

```json
{
  "id": "<string>",
  "created_date": "<string | null>",
  "name": "<string | null>",
  "industry": "<string | null>",
  "description": "<string | null>",
  "country": "<string | null>",
  "city": "<string | null>",
  "lead_status": "<string | null>",
  "lifecycle_stage": "<string | null>",
  "owner": "<string | null>",
  "year_founded": "<string | null>",
  "website_url": "<string | null>"
}
```

## Changelog


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/hubspot/syncs/companies.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/hubspot/syncs/companies.md)

<!-- END  GENERATED CONTENT -->

undefined