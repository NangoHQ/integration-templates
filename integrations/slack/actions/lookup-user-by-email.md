<!-- BEGIN GENERATED CONTENT -->
# Lookup User By Email

## General Information

- **Description:** Finds a user by their registered email address.
- **Version:** 1.0.0
- **Group:** Users
- **Scopes:** `users:read, users:read.email`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_slack_lookupuserbyemail`
- **Input Model:** `ActionInput_slack_lookupuserbyemail`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/slack/actions/lookup-user-by-email.ts)


## Endpoint Reference

### Request Endpoint

`GET /users/lookup`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "email": "<string>"
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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/lookup-user-by-email.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/lookup-user-by-email.md)

<!-- END  GENERATED CONTENT -->

