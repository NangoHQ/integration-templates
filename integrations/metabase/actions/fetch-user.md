<!-- BEGIN GENERATED CONTENT -->
# Fetch User

## General Information

- **Description:** Fetches details of a specific user by ID.
- **Version:** 0.0.1
- **Group:** Users
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/metabase/actions/fetch-user.ts)


## Endpoint Reference

### Request Endpoint

`GET /api/user/:id`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "id": "<integer>"
}
```

### Request Response

```json
{
  "id": "<integer>",
  "firstName": "<string>",
  "lastName": "<string>",
  "email": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/metabase/actions/fetch-user.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/metabase/actions/fetch-user.md)

<!-- END  GENERATED CONTENT -->

