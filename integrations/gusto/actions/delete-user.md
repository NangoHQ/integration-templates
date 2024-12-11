# Delete User

## General Information

- **Description:** Deletes a user in Gusto.
- **Version:** 0.0.1
- **Group:** Others
- **Scopes:** `employments:write`
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/gusto-demo/actions/delete-user.ts)


## Endpoint Reference

### Request Endpoint

- **Path:** `/users`
- **Method:** `DELETE`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "id": "<string>",
  "effectiveDate?": "<string>",
  "runTerminationPayroll?": "<boolean>"
}
```

### Request Response

```json
{
  "success": "<boolean>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/gusto-demo/actions/delete-user.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/gusto-demo/actions/delete-user.md)

<!-- END  GENERATED CONTENT -->

