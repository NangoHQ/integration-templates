# Contacts

## General Information

- **Description:** Fetches a list of contacts from salesforce

- **Version:** 1.0.3
- **Group:** Others
- **Scopes:**: offline_access,api
- **Endpoint Type:** Sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/salesforce-sandbox/syncs/contacts.ts)

## Endpoint Reference

### Request Endpoint

- **Path:** `/contacts`
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
  "id": "<string>",
  "first_name": "<string | null>",
  "last_name": "<string>",
  "account_name": "<string | null>",
  "account_id": "<string | null>",
  "email": "<string | null>",
  "owner_id": "<string>",
  "owner_name": "<string>",
  "mobile": "<string | null>",
  "phone": "<string | null>",
  "salutation": "<string | null>",
  "title": "<string | null>",
  "last_modified_date": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/salesforce-sandbox/syncs/contacts.ts)
-- [ReadMe History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/salesforce-sandbox/syncs/contacts.md)
