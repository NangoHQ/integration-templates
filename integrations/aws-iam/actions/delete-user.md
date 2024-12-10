# Delete User

## General Information

- **Description:** Delete an existing user in AWS IAM. When you delete a user, you must delete the items attached to the user manually, or the deletion fails.

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: _None_
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/aws-iam/actions/delete-user.ts)

## Endpoint Reference

### Request Endpoint

- **Path:** `/users`
- **Method:** `DELETE`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "userName": "<string>"
}
```

### Request Response

```json
{
  "success": "<boolean>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/aws-iam/actions/delete-user.ts)
-- [ReadMe History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/aws-iam/actions/delete-user.md)
