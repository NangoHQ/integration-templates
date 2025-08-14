<!-- BEGIN GENERATED CONTENT -->
# Update Company

## General Information

- **Description:** Update a single company in Hubspot
- **Version:** 1.0.0
- **Group:** Companies
- **Scopes:** `crm.objects.companies.write, oauth`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_hubspot_updatecompany`
- **Input Model:** `ActionInput_hubspot_updatecompany`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/hubspot/actions/update-company.ts)


## Endpoint Reference

### Request Endpoint

`PATCH /companies`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "id": "<string>",
  "name?": "<string>",
  "industry?": "<string>",
  "description?": "<string>",
  "country?": "<string>",
  "city?": "<string>",
  "lead_status?": "<string>",
  "lifecycle_stage?": "<string>",
  "owner?": "<string>",
  "year_founded?": "<string>",
  "website_url?": "<string>"
}
```

### Request Response

```json
{
  "id": "<string>",
  "created_date": "<string>",
  "name?": "<string>",
  "industry?": "<string>",
  "description?": "<string>",
  "country?": "<string>",
  "city?": "<string>",
  "lead_status?": "<string>",
  "lifecycle_stage?": "<string>",
  "owner?": "<string>",
  "year_founded?": "<string>",
  "website_url?": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/hubspot/actions/update-company.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/hubspot/actions/update-company.md)

<!-- END  GENERATED CONTENT -->

