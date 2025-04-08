<!-- BEGIN GENERATED CONTENT -->
# Invoices

## General Information

- **Description:** Fetches all invoices in Netsuite

- **Version:** 1.0.2
- **Group:** Invoices
- **Scopes:** _None_
- **Endpoint Type:** Sync
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/netsuite-tba/syncs/invoices.ts)


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
  "id": "<string>",
  "customerId": "<string>",
  "currency": "<string>",
  "description": "<string | null>",
  "createdAt": "<string>",
  "lines": [
    {
      "itemId": "<string>",
      "quantity": "<number>",
      "amount": "<number>",
      "vatCode?": "<string>",
      "description?": "<string>",
      "locationId?": "<string>"
    }
  ],
  "total": "<number>",
  "status": "<string>"
}
```

### Expected Metadata

```json
{
  "timezone?": "<string | undefined>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/netsuite-tba/syncs/invoices.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/netsuite-tba/syncs/invoices.md)

<!-- END  GENERATED CONTENT -->
### Steps to Use
- The sync requires the **timezone** to be defined in NetSuite's connection metadata to ensure accurate date filtering in API queries. For more on how to set your connection metadata. please visit [Set Connection Metadata](https://docs.nango.dev/reference/api/connection/set-metadata).

- If the **timezone** is not provided, the sync will fall back to **UTC (Etc/UTC)** as the default.
### Locating the Timezone in NetSuite
You can find and set the timezone in NetSuite through the following steps:

1. Check Account Timezone (Company-Level Default)

- Navigate to Setup → Company → Company Information.
- Look for the Time Zone field.
- This is the default timezone used by NetSuite API queries unless overridden.
2. Check User Preferences (User-Level Timezone Override)

- Navigate to Home → Set Preferences.
- Look for the Time Zone setting under "Localization".
- If the API request is executed under a specific user session, this timezone will be used instead of the company-wide setting.
### Example Timezone Format
- The timezone must be specified in IANA format (e.g., "America/New_York" or "UTC").

🚀 If no timezone is set in metadata, the sync will default to UTC (Etc/UTC) to maintain consistency.
