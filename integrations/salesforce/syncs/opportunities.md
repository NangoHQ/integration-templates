<!-- BEGIN GENERATED CONTENT -->
# Opportunities

## General Information

- **Description:** Fetches a list of opportunities from salesforce

- **Version:** 1.0.0
- **Group:** Opportunities
- **Scopes:** `offline_access, api`
- **Endpoint Type:** Sync
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/salesforce/syncs/opportunities.ts)


## Endpoint Reference

### Request Endpoint

`GET /opportunities`

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
  "opportunity_name": "<string>",
  "account_name": "<string | null>",
  "account_id": "<string | null>",
  "amount": "<number | null>",
  "description": "<string | null>",
  "close_date": "<string>",
  "created_by_id": "<string>",
  "created_by": "<string>",
  "owner_id": "<string>",
  "owner_name": "<string>",
  "stage": "<string>",
  "probability": "<number | null>",
  "type": "<string | null>",
  "last_modified_date": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/salesforce/syncs/opportunities.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/salesforce/syncs/opportunities.md)

<!-- END  GENERATED CONTENT -->

