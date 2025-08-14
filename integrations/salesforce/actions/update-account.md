<!-- BEGIN GENERATED CONTENT -->
# Update Account

## General Information

- **Description:** Update a single account in salesforce
- **Version:** 2.0.0
- **Group:** Accounts
- **Scopes:** `offline_access, api`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_salesforce_updateaccount`
- **Input Model:** `ActionInput_salesforce_updateaccount`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/salesforce/actions/update-account.ts)


## Endpoint Reference

### Request Endpoint

`PATCH /accounts`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "description?": "<string>",
  "website?": "<string>",
  "industry?": "<string>",
  "billing_city?": "<string>",
  "billing_country?": "<string>",
  "owner_id?": "<string>",
  "id": "<string>",
  "name?": "<string>"
}
```

### Request Response

```json
{
  "success": "<boolean>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/salesforce/actions/update-account.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/salesforce/actions/update-account.md)

<!-- END  GENERATED CONTENT -->

