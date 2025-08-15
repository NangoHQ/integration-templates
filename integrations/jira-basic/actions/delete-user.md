<!-- BEGIN GENERATED CONTENT -->
# Delete User

## General Information

- **Description:** Deletes a user in Jira. Note that this endpoint is marked as experimental and could 
be deprecated in the future.
- **Version:** 1.0.0
- **Group:** Users
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `ActionOutput_jira_basic_deleteuser`
- **Input Model:** `ActionInput_jira_basic_deleteuser`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/jira-basic/actions/delete-user.ts)


## Endpoint Reference

### Request Endpoint

`DELETE /users`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "id": "<string>"
}
```

### Request Response

```json
{
  "success": "<boolean>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/jira-basic/actions/delete-user.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/jira-basic/actions/delete-user.md)

<!-- END  GENERATED CONTENT -->

