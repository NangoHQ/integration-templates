# Create User

## General Information

- **Description:** Creates a user in DocuSign
- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: openid,signature
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/docusign-sandbox/actions/create-user.ts)

## Endpoint Reference

### Request Endpoint

- **Path:** `/users`
- **Method:** `POST`

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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/docusign-sandbox/actions/create-user.ts)
-- [ReadMe History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/docusign-sandbox/actions/create-user.md)
