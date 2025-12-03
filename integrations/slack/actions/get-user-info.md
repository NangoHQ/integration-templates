<!-- BEGIN GENERATED CONTENT -->
# Get User Info

## General Information

- **Description:** Retrieves information about a specific user.
- **Version:** 1.0.0
- **Group:** Users
- **Scopes:** `users:read`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_slack_getuserinfo`
- **Input Model:** `ActionInput_slack_getuserinfo`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/slack/actions/get-user-info.ts)


## Endpoint Reference

### Request Endpoint

`GET /users/info`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "user_id": "<string>"
}
```

### Request Response

```json
{
  "ok": "<boolean>",
  "user?": "<unknown>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/get-user-info.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/get-user-info.md)

<!-- END  GENERATED CONTENT -->

