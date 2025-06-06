<!-- BEGIN GENERATED CONTENT -->
# Organizations

## General Information

- **Description:** Fetches a list of organizations from pipedrive

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:** `contacts:read`
- **Endpoint Type:** Sync
- **Model:** `PipeDriveOrganization`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/pipedrive/syncs/organizations.ts)


## Endpoint Reference

### Request Endpoint

`GET /pipedrive/organizations`

### Request Query Parameters

- **modified_after:** `(optional, string)` A timestamp (e.g., `2023-05-31T11:46:13.390Z`) used to fetch records modified after this date and time. If not provided, all records are returned. The modified_after parameter is less precise than cursor, as multiple records may share the same modification timestamp.
- **limit:** `(optional, integer)` The maximum number of records to return per page. Defaults to 100.
- **cursor:** `(optional, string)` A marker used to fetch records modified after a specific point in time.If not provided, all records are returned.Each record includes a cursor value found in _nango_metadata.cursor.Save the cursor from the last record retrieved to track your sync progress.Use the cursor parameter together with the limit parameter to paginate through records.The cursor is more precise than modified_after, as it can differentiate between records with the same modification timestamp.
- **filter:** `(optional, added | updated | deleted)` Filter to only show results that have been added or updated or deleted.
- **ids:** `(optional, string[])` An array of string containing a list of your records IDs. The list will be filtered to include only the records with a matching ID.

### Request Body

_No request body_

### Request Response

```json
{
  "id": "<integer>",
  "owner_id": "<integer>",
  "name": "<string>",
  "active_flag": "<boolean>",
  "update_time": "<date>",
  "delete_time": "<date>",
  "add_time": "<date>",
  "visible_to": "<string>",
  "label": "<integer>",
  "address": "<integer>",
  "address_subpremise": "<string>",
  "address_street_number": "<string>",
  "address_route": "<string>",
  "address_sublocality": "<string>",
  "address_locality": "<string>",
  "address_admin_area_level_1": "<string>",
  "address_admin_area_level_2": "<string>",
  "address_country": "<string>",
  "address_postal_code": "<string>",
  "address_formatted_address": "<string>",
  "cc_email": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/pipedrive/syncs/organizations.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/pipedrive/syncs/organizations.md)

<!-- END  GENERATED CONTENT -->

