<!-- BEGIN GENERATED CONTENT -->
# Update Opportunity

## General Information

- **Description:** Update a single opportunity in salesforce
- **Version:** 2.0.0
- **Group:** Opportunities
- **Scopes:** `offline_access, api`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_salesforce_updateopportunity`
- **Input Model:** `ActionInput_salesforce_updateopportunity`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/salesforce/actions/update-opportunity.ts)


## Endpoint Reference

### Request Endpoint

`PATCH /opportunities`

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
  "id": "<string>",
  "opportunity_name?": "<string>",
  "close_date?": "<string>",
  "stage?": "<string>"
}
```

### Request Response

```json
{
  "success": "<boolean>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/salesforce/actions/update-opportunity.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/salesforce/actions/update-opportunity.md)

<!-- END  GENERATED CONTENT -->

