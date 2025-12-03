<!-- BEGIN GENERATED CONTENT -->
# List Users

## General Information

- **Description:** Lists all users in a workspace including active and deactivated.
- **Version:** 1.0.0
- **Group:** Users
- **Scopes:** `users:read`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_slack_listusers`
- **Input Model:** `ActionInput_slack_listusers`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/slack/actions/list-users.ts)


## Endpoint Reference

### Request Endpoint

`GET /users/list`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "limit?": "<number>",
  "cursor?": "<string>"
}
```

### Request Response

```json
{
  "ok": "<boolean>",
  "members": "<unknown[]>",
  "response_metadata?": "<unknown>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/list-users.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/list-users.md)

<!-- END  GENERATED CONTENT -->

