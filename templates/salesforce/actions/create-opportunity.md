<!-- BEGIN GENERATED CONTENT -->
# Create Opportunity

## General Information

- **Description:** Create a single opportunity in salesforce
- **Version:** 1.0.1
- **Group:** Opportunities
- **Scopes:** `offline_access, api`
- **Endpoint Type:** Action
- **Model:** `ActionResponse`
- **Input Model:** `CreateOpportunityInput`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/salesforce/actions/create-opportunity.ts)


## Endpoint Reference

### Request Endpoint

`POST /opportunities`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "account_id?": "<string | undefined>",
  "amount?": "<number | undefined>",
  "description?": "<string | undefined>",
  "created_by_id?": "<string | undefined>",
  "owner_id?": "<string | undefined>",
  "probability?": "<number | undefined>",
  "type?": "<string | undefined>",
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

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/salesforce/actions/create-opportunity.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/salesforce/actions/create-opportunity.md)

<!-- END  GENERATED CONTENT -->

