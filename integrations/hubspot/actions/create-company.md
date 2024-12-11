# Create Company

## General Information

- **Description:** Create a single company in Hubspot
- **Version:** 1.0.0
- **Group:** Others
- **Scopes:** `crm.objects.companies.write, oauth`
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/hubspot/actions/create-company.ts)


## Endpoint Reference

### Request Endpoint

- **Path:** `/companies`
- **Method:** `POST`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
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

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/hubspot/actions/create-company.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/hubspot/actions/create-company.md)

<!-- END  GENERATED CONTENT -->

