<!-- BEGIN GENERATED CONTENT -->
# Fetch Accounts

## General Information

- **Description:** Fetch account list and user information from Basecamp
- **Version:** 1.0.0
- **Group:** Accounts
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `ActionOutput_basecamp_fetchaccounts`
- **Input Model:** `ActionInput_basecamp_fetchaccounts`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/basecamp/actions/fetch-accounts.ts)


## Endpoint Reference

### Request Endpoint

`GET /accounts`

### Request Query Parameters

_No request parameters_

### Request Body

```json
"<null>"
```

### Request Response

```json
{
  "identity": {
    "id": "<number>",
    "firstName": "<string>",
    "lastName": "<string>",
    "email": "<string>"
  },
  "accounts": [
    {
      "id": "<number>",
      "name": "<string>",
      "product": "<string>",
      "href": "<string>",
      "app_href": "<string>",
      "hidden?": "<boolean>"
    }
  ]
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/basecamp/actions/fetch-accounts.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/basecamp/actions/fetch-accounts.md)

<!-- END  GENERATED CONTENT -->

