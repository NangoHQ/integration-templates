<!-- BEGIN GENERATED CONTENT -->
# Fetch Roles

## General Information

- **Description:** Fetch the roles on an account. Requires an enterprise account.
- **Version:** 1.0.0
- **Group:** Roles
- **Scopes:** `oauth, settings.users.read (standard scope), crm.objects.users.read (granular scope)`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_hubspot_fetchroles`
- **Input Model:** `ActionInput_hubspot_fetchroles`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/hubspot/actions/fetch-roles.ts)


## Endpoint Reference

### Request Endpoint

`GET /roles`

### Request Query Parameters

_No request parameters_

### Request Body

```json
"<null>"
```

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

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/hubspot/actions/fetch-roles.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/hubspot/actions/fetch-roles.md)

<!-- END  GENERATED CONTENT -->

