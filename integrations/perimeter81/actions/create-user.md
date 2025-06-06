<!-- BEGIN GENERATED CONTENT -->
# Create User

## General Information

- **Description:** Creates a user in Perimeter81
- **Version:** 0.0.1
- **Group:** Users
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `User`
- **Input Model:** `Perimeter81CreateUser`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/perimeter81/actions/create-user.ts)


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
  "idpType?": "<string>",
  "accessGroups?": [
    "<string>"
  ],
  "emailVerified?": "<boolean>",
  "inviteMessage?": "<string>",
  "origin?": "<string>",
  "profileData?": {
    "roleName?": "<string>",
    "phone?": "<string>",
    "icon?": "<string>",
    "origin?": "<string>"
  }
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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/perimeter81/actions/create-user.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/perimeter81/actions/create-user.md)

<!-- END  GENERATED CONTENT -->

