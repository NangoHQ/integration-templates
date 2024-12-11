<!-- BEGIN GENERATED CONTENT -->
# Add User

## General Information

- **Description:** An action to add a user to the organization in zoho mail

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:** `ZohoMail.organization.accounts.CREATE`
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/zoho-mail/actions/add-user.ts)


## Endpoint Reference

### Request Endpoint

`POST /zoho-mail/add-user`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "zoid": "<number>",
  "primaryEmailAddress": "<string>",
  "password": "<string>",
  "displayName": "<string>",
  "role": "<string>",
  "country": "<string>",
  "language": "<string>",
  "timeZone": "<string>",
  "oneTimePassword": "<boolean>",
  "groupMailList": [
    "<string>"
  ]
}
```

### Request Response

```json
{
  "status": "<object>",
  "data": "<object>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/zoho-mail/actions/add-user.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/zoho-mail/actions/add-user.md)

<!-- END  GENERATED CONTENT -->

