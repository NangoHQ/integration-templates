<!-- BEGIN GENERATED CONTENT -->
# List User Group Members

## General Information

- **Description:** Lists users within a specific user group.
- **Version:** 1.0.0
- **Group:** User Groups
- **Scopes:** `usergroups:read`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_slack_listusergroupmembers`
- **Input Model:** `ActionInput_slack_listusergroupmembers`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/slack/actions/list-user-group-members.ts)


## Endpoint Reference

### Request Endpoint

`GET /user-group-members`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "usergroup": "<string>"
}
```

### Request Response

```json
{
  "ok": "<boolean>",
  "users": "<string[]>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/list-user-group-members.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/slack/actions/list-user-group-members.md)

<!-- END  GENERATED CONTENT -->

