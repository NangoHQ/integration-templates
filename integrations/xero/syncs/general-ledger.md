<!-- BEGIN GENERATED CONTENT -->
# General Ledger

## General Information

- **Description:** Fetch all general ledger entries in Xero

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:** `accounting.journals.read`
- **Endpoint Type:** Sync
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/xero/syncs/general-ledger.ts)


## Endpoint Reference

### Request Endpoint

`GET /general-ledger`

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
  "date": "<string | null>",
  "number": "<number>",
  "createdDate": "<string | null>",
  "lines": [
    {
      "journalLineId": "<string>",
      "accountId": "<string>",
      "accountCode": "<string>",
      "accountName": "<string>",
      "description?": "<string | undefined>",
      "netAmount": "<number>",
      "grossAmount": "<number>",
      "taxAmount": "<number>",
      "taxType?": "<string | undefined>",
      "taxName?": "<string | undefined>",
      "trackingCategories": [
        {
          "name": "<string>",
          "option": "<string>",
          "trackingCategoryId": "<string>",
          "trackingOptionId": "<string>",
          "options": [
            "<string>"
          ]
        }
      ]
    }
  ]
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/xero/syncs/general-ledger.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/xero/syncs/general-ledger.md)

<!-- END  GENERATED CONTENT -->
