<!-- BEGIN GENERATED CONTENT -->
# Bank Transactions

## General Information

- **Description:** Fetches all bank transactions in Xero. Incremental sync, detects deletes, metadata is not required.

- **Version:** 1.0.1
- **Group:** Bank Transactions
- **Scopes:** `accounting.transactions`
- **Endpoint Type:** Sync
- **Model:** `BankTransaction`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/xero/syncs/bank-transactions.ts)


## Endpoint Reference

### Request Endpoint

`GET /BankTransactions`

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
  "type": "<string>",
  "bank_account_id": "<string>",
  "bank_account_code": "<string>",
  "bank_account_name": "<string>",
  "contact_id": "<string>",
  "contact_name": "<string>",
  "date": "<string | null>",
  "status": "<string>",
  "reference": "<string | null>",
  "is_reconciled": "<boolean>",
  "currency_code": "<string>",
  "currency_rate": "<number | null>",
  "total": "<number>",
  "sub_total": "<number>",
  "total_tax": "<number>",
  "line_amount_types": "<string>",
  "line_items": [
    {
      "description": "<string>",
      "quantity": "<number>",
      "unit_amount": "<number>",
      "account_code": "<string>",
      "item_code": "<string | null>",
      "line_item_id": "<string>",
      "tax_type": "<string | null>",
      "tax_amount": "<number>",
      "line_amount": "<number>",
      "tracking": "<TrackingCategory[] | null>"
    }
  ],
  "updated_date": "<string | null>",
  "url": "<string | null>",
  "has_attachments": "<boolean>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/xero/syncs/bank-transactions.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/xero/syncs/bank-transactions.md)

<!-- END  GENERATED CONTENT -->

