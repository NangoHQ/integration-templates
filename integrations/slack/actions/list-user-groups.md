<!-- BEGIN GENERATED CONTENT -->
# List User Groups

## General Information

- **Description:** Lists all user groups in the workspace.
- **Version:** 1.0.0
- **Group:** Actions
- **Scopes:** `usergroups:read`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_slack_listusergroups`
- **Input Model:** `ActionInput_slack_listusergroups`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/slack/actions/list-user-groups.ts)


## Endpoint Reference

### Request Endpoint

`GET /list-user-groups`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "include_disabled?": "<boolean>",
  "include_count?": "<boolean>"
}
```

### Request Response

```json
{
  "ok": "<boolean>",
  "usergroups": "<unknown[]>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/list-user-groups.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/list-user-groups.md)

<!-- END  GENERATED CONTENT -->

