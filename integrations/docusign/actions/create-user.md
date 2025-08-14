<!-- BEGIN GENERATED CONTENT -->
# Create User

## General Information

- **Description:** Creates a user in DocuSign
- **Version:** 2.0.0
- **Group:** Users
- **Scopes:** `openid, signature`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_docusign_createuser`
- **Input Model:** `ActionInput_docusign_createuser`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/docusign/actions/create-user.ts)


## Endpoint Reference

### Request Endpoint

`POST /users`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "firstName": "<string>",
  "lastName": "<string>",
  "email": "<string>",
  "userName?": "<string>",
  "title?": "<string>",
  "phoneNumber?": "<string>",
  "company?": "<string>",
  "countryCode?": "<string>",
  "activationAccessCode?": "<string>",
  "settings?": {
    "language?": "<string>",
    "timeZone?": "<string>"
  },
  "userStatus?": "<string>"
}
```

### Request Response

```json
{
  "id": "<string>",
  "email": "<string>",
  "firstName": "<string>",
  "lastName": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/docusign/actions/create-user.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/docusign/actions/create-user.md)

<!-- END  GENERATED CONTENT -->

