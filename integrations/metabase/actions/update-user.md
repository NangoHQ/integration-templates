<!-- BEGIN GENERATED CONTENT -->
# Update User

## General Information

- **Description:** Updates an existing, active user in Metabase.
- **Version:** 1.0.0
- **Group:** Users
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `ActionOutput_metabase_updateuser`
- **Input Model:** `ActionInput_metabase_updateuser`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/metabase/actions/update-user.ts)


## Endpoint Reference

### Request Endpoint

`PUT /users`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "id": "<number>",
  "email": "<string | null>",
  "first_name": "<string | null>",
  "last_name": "<string | null>",
  "is_group_manager": "<boolean | null>",
  "locale": "<string | null>",
  "is_superuser": "<boolean | null>"
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

