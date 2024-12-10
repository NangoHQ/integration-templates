# Create User

## General Information

- **Description:** Creates a user in Box. Requires an enterprise account.
- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: _None_
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/box/actions/create-user.ts)


## Endpoint Reference

### Request Endpoint

- **Path:** `/users`
- **Method:** `POST`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "firstName": "<string>",
  "lastName": "<string>",
  "email": "<string>",
  "address?": "<string>",
  "can_see_managed_users?": "<boolean>",
  "external_app_user_id?": "<string>",
  "is_exempt_from_device_limits?": "<boolean>",
  "is_exempt_from_login_verification?": "<boolean>",
  "is_external_collab_restricted?": "<boolean>",
  "is_platform_access_only?": "<boolean>",
  "is_sync_enabled?": "<boolean>",
  "job_title?": "<string>",
  "language?": "<string>",
  "phone?": "<string>",
  "role?": "<coadmin | user>",
  "space_amount?": "<number>",
  "status?": "<active| inactive| cannot_delete_edit| cannot_delete_edit_upload>",
  "timezone?": "<string>",
  "tracking_codes?": [
    {
      "type?": "<tracking_code>",
      "name?": "<string>",
      "value?": "<string>"
    }
  ]
}
```

### Request Response

```json
{
  "id": "<string>",
  "email": "<string>",
  "firstName": "<string>",
  "lastName": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/box/actions/create-user.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/box/actions/create-user.md)

<!-- END  GENERATED CONTENT -->















