<!-- BEGIN GENERATED CONTENT -->
# List User Reactions

## General Information

- **Description:** Lists all items with reactions made by the user.
- **Version:** 1.0.0
- **Group:** Actions
- **Scopes:** `reactions:read`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_slack_listuserreactions`
- **Input Model:** `ActionInput_slack_listuserreactions`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/slack/actions/list-user-reactions.ts)


## Endpoint Reference

### Request Endpoint

`GET /list-user-reactions`

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
  "items": "<unknown[]>",
  "response_metadata?": "<unknown>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/list-user-reactions.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/list-user-reactions.md)

<!-- END  GENERATED CONTENT -->

