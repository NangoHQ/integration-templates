<!-- BEGIN GENERATED CONTENT -->
# Add User Group

## General Information

- **Description:** Assigns a user to a group with the OKTA_GROUP type
- **Version:** 0.0.1
- **Group:** Others
- **Scopes:** `okta.groups.manage`
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/okta/actions/add-user-group.ts)


## Endpoint Reference

### Request Endpoint

`PUT /user-groups`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "groupId": "<string>",
  "userId": "<string>"
}
```

### Request Response

```json
{
  "success": "<boolean>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/okta/actions/add-user-group.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/okta/actions/add-user-group.md)

<!-- END  GENERATED CONTENT -->

