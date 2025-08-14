<!-- BEGIN GENERATED CONTENT -->
# Fetch Account Information

## General Information

- **Description:** Fetch the account information from Hubspot
- **Version:** 1.0.0
- **Group:** Others
- **Scopes:** `oauth`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_hubspot_fetchaccountinformation`
- **Input Model:** `ActionInput_hubspot_fetchaccountinformation`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/hubspot/actions/fetch-account-information.ts)


## Endpoint Reference

### Request Endpoint

`GET /account-information`

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
  "type": "<string>",
  "timeZone": "<string>",
  "companyCurrency": "<string>",
  "additionalCurrencies": "<string[]>",
  "utcOffset": "<string>",
  "utcOffsetMilliseconds": "<number>",
  "uiDomain": "<string>",
  "dataHostingLocation": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/hubspot/actions/fetch-account-information.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/hubspot/actions/fetch-account-information.md)

<!-- END  GENERATED CONTENT -->

