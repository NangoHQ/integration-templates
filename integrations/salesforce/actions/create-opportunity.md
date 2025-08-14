<!-- BEGIN GENERATED CONTENT -->
# Create Opportunity

## General Information

- **Description:** Create a single opportunity in salesforce
- **Version:** 2.0.0
- **Group:** Opportunities
- **Scopes:** `offline_access, api`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_salesforce_createopportunity`
- **Input Model:** `ActionInput_salesforce_createopportunity`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/salesforce/actions/create-opportunity.ts)


## Endpoint Reference

### Request Endpoint

`POST /opportunities`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "account_id?": "<string>",
  "amount?": "<number>",
  "description?": "<string>",
  "created_by_id?": "<string>",
  "owner_id?": "<string>",
  "probability?": "<number>",
  "type?": "<string>",
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
  "errors": "<unknown[]>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/salesforce/actions/create-opportunity.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/salesforce/actions/create-opportunity.md)

<!-- END  GENERATED CONTENT -->

