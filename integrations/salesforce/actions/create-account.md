<!-- BEGIN GENERATED CONTENT -->
# Create Account

## General Information

- **Description:** Create a single account in salesforce
- **Version:** 2.0.0
- **Group:** Accounts
- **Scopes:** `offline_access, api`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_salesforce_createaccount`
- **Input Model:** `ActionInput_salesforce_createaccount`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/salesforce/actions/create-account.ts)


## Endpoint Reference

### Request Endpoint

`POST /accounts`

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
  "name": "<string>"
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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/salesforce/actions/create-account.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/salesforce/actions/create-account.md)

<!-- END  GENERATED CONTENT -->

