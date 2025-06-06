<!-- BEGIN GENERATED CONTENT -->
# Invoices

## General Information

- **Description:** Fetches all invoices in Xero. Incremental sync.

- **Version:** 1.0.3
- **Group:** Invoices
- **Scopes:** `accounting.transactions`
- **Endpoint Type:** Sync
- **Model:** `Invoice`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/xero/syncs/invoices.ts)


## Endpoint Reference

### Request Endpoint

`GET /invoices`

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
  "type": "<ACCPAY | ACCREC>",
  "external_contact_id": "<string>",
  "url?": "<string>",
  "id": "<string>",
  "issuing_date": "<string | null>",
  "payment_due_date": "<string | null>",
  "status": "<string>",
  "number?": "<string>",
  "currency": "<string>",
  "purchase_order": "<string | null>",
  "fees": [
    {
      "account_code?": "<string>",
      "item_code?": "<string | null>",
      "account_external_id?": "<string | null>",
      "discount_amount_cents?": "<number | null>",
      "discount_rate?": "<number | null>",
      "item_id": "<string>",
      "description": "<string | null>",
      "units": "<number | null>",
      "precise_unit_amount": "<number | null>",
      "amount_cents": "<number | null>",
      "taxes_amount_cents": "<number | null>"
    }
  ]
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/xero/syncs/invoices.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/xero/syncs/invoices.md)

<!-- END  GENERATED CONTENT -->

