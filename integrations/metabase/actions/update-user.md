<!-- BEGIN GENERATED CONTENT -->
# Update User

## General Information

- **Description:** Updates an existing, active user in Metabase.
- **Version:** 0.0.1
- **Group:** Users
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/metabase/actions/update-user.ts)


## Endpoint Reference

### Request Endpoint

`PUT /api/user/:id`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "id": "<integer>",
  "email": "<string | null>",
  "first_name": "<string | null>",
  "last_name": "<string | null>",
  "is_group_manager": "<boolean | null>",
  "locale": "<string | null>",
  "user_group_memberships": {
    "nullable": true,
    "type": "<array>",
    "items": {
      "id": "<integer>",
      "is_group_manager": "<boolean | null>"
    }
  },
  "is_superuser": "<boolean | null>",
  "login_attributes": {
    "nullable": true,
    "type": "<object>"
  }
}
```

### Request Response

```json
{
  "success": "<boolean>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/metabase/actions/update-user.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/metabase/actions/update-user.md)

<!-- END  GENERATED CONTENT -->

