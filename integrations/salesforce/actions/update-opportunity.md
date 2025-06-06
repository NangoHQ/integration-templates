<!-- BEGIN GENERATED CONTENT -->
# Update Opportunity

## General Information

- **Description:** Update a single opportunity in salesforce
- **Version:** 1.0.1
- **Group:** Opportunities
- **Scopes:** `offline_access, api`
- **Endpoint Type:** Action
- **Model:** `SuccessResponse`
- **Input Model:** `UpdateOpportunityInput`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/salesforce/actions/update-opportunity.ts)


## Endpoint Reference

### Request Endpoint

`PATCH /opportunities`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "opportunity_name?": "<string | undefined>",
  "close_date?": "<string | undefined>",
  "stage?": "<string | undefined>"
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

