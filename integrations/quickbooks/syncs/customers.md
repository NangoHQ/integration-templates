<!-- BEGIN GENERATED CONTENT -->
# Customers

## General Information

- **Description:** Fetches all QuickBooks customers. Handles both active and archived customers, saving or deleting them based on their status.
- **Version:** 1.0.0
- **Group:** Customers
- **Scopes:** `com.intuit.quickbooks.accounting`
- **Endpoint Type:** Sync
- **Model:** `Customer`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/quickbooks/syncs/customers.ts)


## Endpoint Reference

### Request Endpoint

`GET /customers`

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
  "given_name": "<string | null>",
  "display_name": "<string | null>",
  "active": "<boolean>",
  "balance_cents": "<number>",
  "taxable": "<boolean>",
  "primary_email": "<string | null>",
  "primary_phone": "<string | null>",
  "bill_address": "<{\"city\":\"<string | null>\",\"line1\":\"<string | null>\",\"postal_code\":\"<string | null>\",\"country\":\"<string | null>\",\"id\":\"<string>\"} | <null>>",
  "ship_address": "<{\"city\":\"<string | null>\",\"line1\":\"<string | null>\",\"postal_code\":\"<string | null>\",\"country\":\"<string | null>\",\"id\":\"<string>\"} | <null>>"
}
```

### Expected Metadata

```json
{}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/quickbooks/syncs/customers.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/quickbooks/syncs/customers.md)

<!-- END  GENERATED CONTENT -->

