# Fetch Roles

## General Information

- **Description:** Fetch the roles on an account. Requires an enterprise account.
- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: oauth,settings.users.read (standard scope),crm.objects.users.read (granular scope)
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/hubspot/actions/fetch-roles.ts)

## Endpoint Reference

### Request Endpoint

- **Path:** /roles
- **Method:** GET

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

### Request Response

```json
{
  "results": [
    {
      "requiresBillingWrite": "<boolean>",
      "name": "<string>",
      "id": "<string>"
    }
  ]
}
```
