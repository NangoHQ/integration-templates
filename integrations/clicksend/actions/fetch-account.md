<!-- BEGIN GENERATED CONTENT -->
# Fetch Account

## General Information

- **Description:** Fetches basic information about the ClickSend account.
- **Version:** 2.0.0
- **Group:** Account
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `ActionOutput_clicksend_fetchaccount`
- **Input Model:** `ActionInput_clicksend_fetchaccount`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/clicksend/actions/fetch-account.ts)


## Endpoint Reference

### Request Endpoint

`GET /account`

### Request Query Parameters

_No request parameters_

### Request Body

```json
"<null>"
```

### Request Response

```json
{
  "id": "<string>",
  "name": "<string>",
  "email": "<string>",
  "phone": "<string>",
  "balance": "<string>",
  "country": "<string>",
  "timezone": "<string>",
  "accountName": "<string>",
  "accountBillingEmail": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/clicksend/actions/fetch-account.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/clicksend/actions/fetch-account.md)

<!-- END  GENERATED CONTENT -->

