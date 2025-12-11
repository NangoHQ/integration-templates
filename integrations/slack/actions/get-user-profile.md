<!-- BEGIN GENERATED CONTENT -->
# Get User Profile

## General Information

- **Description:** Retrieves detailed user profile including custom fields.
- **Version:** 1.0.0
- **Group:** Users
- **Scopes:** `users:read`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_slack_getuserprofile`
- **Input Model:** `ActionInput_slack_getuserprofile`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/slack/actions/get-user-profile.ts)


## Endpoint Reference

### Request Endpoint

`GET /users/profile`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "user_id?": "<string>"
}
```

### Request Response

```json
{
  "ok": "<boolean>",
  "profile?": "<unknown>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/get-user-profile.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/get-user-profile.md)

<!-- END  GENERATED CONTENT -->

