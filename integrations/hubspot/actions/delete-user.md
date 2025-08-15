<!-- BEGIN GENERATED CONTENT -->
# Delete User

## General Information

- **Description:** Deletes a user in Hubspot
- **Version:** 1.0.0
- **Group:** Users
- **Scopes:** `oauth, settings.users.write (standard scope), crm.objects.users.write (granular)`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_hubspot_deleteuser`
- **Input Model:** `ActionInput_hubspot_deleteuser`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/hubspot/actions/delete-user.ts)


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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/hubspot/actions/delete-user.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/hubspot/actions/delete-user.md)

<!-- END  GENERATED CONTENT -->

