<!-- BEGIN GENERATED CONTENT -->
# Deposits

## General Information

- **Description:** Fetches all QuickBooks deposits

- **Version:** 0.0.1
- **Group:** Deposits
- **Scopes:** `com.intuit.quickbooks.accounting`
- **Endpoint Type:** Sync
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/quickbooks-sandbox/syncs/deposits.ts)


## Endpoint Reference

### Request Endpoint

`GET /deposits`

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
  "created_at?": "<string>",
  "updated_at?": "<string>",
  "id": "<string>",
  "account_id?": "<string | undefined>",
  "account_name?": "<string | undefined>",
  "txn_date?": "<string>",
  "total_amount?": "<number | undefined>",
  "currency?": "<string>",
  "private_note?": "<string | undefined>",
  "lines?": [
    {
      "id?": "<string>",
      "amount": "<number>",
      "detail_type?": "<string>",
      "deposit_account_id?": "<string | undefined>",
      "deposit_account_name?": "<string | undefined>"
    }
  ]
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/quickbooks-sandbox/syncs/deposits.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/quickbooks-sandbox/syncs/deposits.md)

<!-- END  GENERATED CONTENT -->

