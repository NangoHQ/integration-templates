<!-- BEGIN GENERATED CONTENT -->
# Tickets

## General Information

- **Description:** Fetches a list of tickets from salesforce

- **Version:** 1.0.2
- **Group:** Others
- **Scopes:** _None_
- **Endpoint Type:** Sync
- **Model:** `Ticket`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/salesforce/syncs/tickets.ts)


## Endpoint Reference

### Request Endpoint

`GET /tickets`

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
  "id": "<string>",
  "case_number": "<string>",
  "subject": "<string | null>",
  "account_id": "<string | null>",
  "account_name": "<string | null>",
  "contact_id": "<string | null>",
  "contact_name": "<string | null>",
  "owner_id": "<string>",
  "owner_name": "<string | null>",
  "priority": "<string>",
  "status": "<string>",
  "description": "<string | null>",
  "type": "<string | null>",
  "created_date": "<string>",
  "closed_date": "<string | null>",
  "origin": "<string | null>",
  "is_closed": "<boolean>",
  "is_escalated": "<boolean>",
  "conversation": [
    {
      "id": "<string>",
      "body": "<string>",
      "created_date": "<string>",
      "created_by": "<string>"
    }
  ],
  "last_modified_date": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/salesforce/syncs/tickets.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/salesforce/syncs/tickets.md)

<!-- END  GENERATED CONTENT -->

