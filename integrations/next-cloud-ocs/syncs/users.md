# Users

## General Information

- **Description:** Fetches a list of all users' details from NextCloud account

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:** `undefined`
- **Endpoint Type:** Sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/next-cloud-ocs/syncs/users.ts)


## Endpoint Reference

### Request Endpoint

- **Path:** `/next-cloud-ocs/next-cloud-users`
- **Method:** `GET`

### Request Query Parameters

- **modified_after:** `(optional, string)` A timestamp (e.g., `2023-05-31T11:46:13.390Z`) used to fetch records modified after this date and time. If not provided, all records are returned. The modified_after parameter is less precise than cursor, as multiple records may share the same modification timestamp.
- **limit:** `(optional, integer)` The maximum number of records to return per page. Defaults to 100.
- **cursor:** `(optional, string)` A marker used to fetch records modified after a specific point in time.If not provided, all records are returned.Each record includes a cursor value found in _nango_metadata.cursor.Save the cursor from the last record retrieved to track your sync progress.Use the cursor parameter together with the limit parameter to paginate through records.The cursor is more precise than modified_after, as it can differentiate between records with the same modification timestamp.
- **filter:** `(optional, added | updated | deleted)` Filter to only show results that have been added or updated or deleted.

### Request Body

_No request body_

### Request Response

```json
{
  "enabled": "<boolean>",
  "id": "<string>",
  "lastLogin": "<number>",
  "backend": "<string>",
  "subadmin": [
    "<string>"
  ],
  "quota": {
    "free": "<number>",
    "used": "<number>",
    "total": "<number>",
    "relative": "<number>",
    "quota": "<number>"
  },
  "manager": "<string>",
  "avatarScope": "<string>",
  "email": "<string>",
  "emailScope": "<string>",
  "additional_mail": [
    "<string>"
  ],
  "additional_mailScope": [
    "<string>"
  ],
  "displayname": "<string>",
  "display_name": "<string>",
  "displaynameScope": "<string>",
  "phone": "<string>",
  "phoneScope": "<string>",
  "address": "<string>",
  "addressScope": "<string>",
  "website": "<string>",
  "websiteScope": "<string>",
  "twitter": "<string>",
  "twitterScope": "<string>",
  "fediverse": "<string>",
  "fediverseScope": "<string>",
  "organisation": "<string>",
  "organisationScope": "<string>",
  "role": "<string>",
  "roleScope": "<string>",
  "headline": "<string>",
  "headlineScope": "<string>",
  "biography": "<string>",
  "biographyScope": "<string>",
  "profile_enabled": "<string>",
  "profile_enabledScope": "<string>",
  "groups": [
    "<string>"
  ],
  "language": "<string>",
  "locale": "<string>",
  "notify_email": "<boolean>",
  "backendCapabilities": {
    "setDisplayName": "<boolean>",
    "setPassword": "<boolean>"
  }
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/next-cloud-ocs/syncs/users.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/next-cloud-ocs/syncs/users.md)

<!-- END  GENERATED CONTENT -->

