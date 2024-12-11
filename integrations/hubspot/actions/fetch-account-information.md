# Fetch Account Information

## General Information

- **Description:** Fetch the account information from Hubspot
- **Version:** 0.0.1
- **Group:** Others
- **Scopes:** `oauth`
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/hubspot/actions/fetch-account-information.ts)


## Endpoint Reference

### Request Endpoint

- **Path:** `/account-information`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

### Request Response

```json
{
  "id": "<string>",
  "type": "<string>",
  "timeZone": "<string>",
  "companyCurrency": "<string>",
  "additionalCurrencies": [
    "<string>"
  ],
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

