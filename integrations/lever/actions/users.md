<!-- BEGIN GENERATED CONTENT -->
# Users

## General Information

- **Description:** Lists all the users in your Lever account. Only active users are included by default.
- **Version:** 1.0.0
- **Group:** Users
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `ActionOutput_lever_users`
- **Input Model:** `ActionInput_lever_users`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/lever/actions/users.ts)


## Endpoint Reference

### Request Endpoint

`GET /users`

### Request Query Parameters

_No request parameters_

### Request Body

```json
"<null>"
```

### Request Response

```json
{
  "users": [
    {
      "id": "<string>",
      "name": "<string>",
      "username": "<string>",
      "email": "<string>",
      "accessRole": "<string>",
      "photo": "<string | null>",
      "createdAt": "<number>",
      "deactivatedAt": "<string | null>",
      "externalDirectoryId": "<string | null>",
      "linkedContactIds": "<<string[]> | <null>>",
      "jobTitle": "<string | null>",
      "managerId": "<string | null>"
    }
  ]
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/lever/actions/users.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/lever/actions/users.md)

<!-- END  GENERATED CONTENT -->

