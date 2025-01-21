<!-- BEGIN GENERATED CONTENT -->
# Transfers

## General Information

- **Description:** Fetches all QuickBooks transfers

- **Version:** 0.0.1
- **Group:** Transfers
- **Scopes:** `com.intuit.quickbooks.accounting`
- **Endpoint Type:** Sync
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/quickbooks/syncs/transfers.ts)


## Endpoint Reference

### Request Endpoint

`GET /transfers`

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
  "created_at": "<string | null>",
  "updated_at": "<string>",
  "id": "<string>",
  "from_account_id?": "<string | undefined>",
  "from_account_name?": "<string | undefined>",
  "to_account_id?": "<string | undefined>",
  "to_account_name?": "<string | undefined>",
  "amount": "<number>",
  "currency": "<string>",
  "txn_date": "<string>",
  "private_note?": "<string | undefined>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/quickbooks/syncs/transfers.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/quickbooks/syncs/transfers.md)

<!-- END  GENERATED CONTENT -->

