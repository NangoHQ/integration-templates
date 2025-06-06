<!-- BEGIN GENERATED CONTENT -->
# Create User

## General Information

- **Description:** Creates a user in Zoom. Requires Pro account or higher
- **Version:** 0.0.1
- **Group:** Users
- **Scopes:** `user:write, user:write:admin`
- **Endpoint Type:** Action
- **Model:** `User`
- **Input Model:** `ZoomCreateUser`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/zoom/actions/create-user.ts)


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
  "action?": "<create | autoCreate | custCreate | ssoCreate>",
  "display_name?": "<string>",
  "type?": "<basic | licensed | UnassignedWithoutMeetingsBasic | None>"
}
```

### Request Response

```json
{
  "id": "<string>",
  "firstName": "<string>",
  "lastName": "<string>",
  "email": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/zoom/actions/create-user.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/zoom/actions/create-user.md)

<!-- END  GENERATED CONTENT -->

