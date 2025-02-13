<!-- BEGIN GENERATED CONTENT -->
# Purchases

## General Information

- **Description:** Fetches all QuickBooks purchases

- **Version:** 0.0.1
- **Group:** Purchases
- **Scopes:** `com.intuit.quickbooks.accounting`
- **Endpoint Type:** Sync
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/quickbooks/syncs/purchases.ts)


## Endpoint Reference

### Request Endpoint

`GET /purchases`

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
  "created_at": "<string>",
  "updated_at": "<string>",
  "id": "<string>",
  "account_id?": "<string | undefined>",
  "account_name?": "<string | undefined>",
  "payment_type": "<string>",
  "entity_type?": "<string | undefined>",
  "entity_id?": "<string | undefined>",
  "entity_name": "<string | undefined>",
  "total_amount": "<number>",
  "print_status?": "<string>",
  "doc_number?": "<string>",
  "txn_date": "<string>",
  "currency": "<string>",
  "lines": [
    {
      "id": "<string>",
      "description?": "<string>",
      "detail_type": "<string>",
      "amount": "<number>",
      "account_name?": "<string | undefined>",
      "account_id?": "<string | undefined>",
      "billable_status?": "<string | undefined>",
      "tax_code?": "<string | undefined>"
    }
  ]
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/quickbooks/syncs/purchases.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/quickbooks/syncs/purchases.md)

<!-- END  GENERATED CONTENT -->

