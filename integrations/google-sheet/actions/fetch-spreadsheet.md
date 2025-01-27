<!-- BEGIN GENERATED CONTENT -->
# Fetch Spreadsheet

## General Information

- **Description:** Fetches the content of a spreadsheet given its ID.

- **Version:** 1.0.0
- **Group:** Others
- **Scopes:** `https://www.googleapis.com/auth/spreadsheets.readonly`
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/google-sheet/actions/fetch-spreadsheet.ts)


## Endpoint Reference

### Request Endpoint

`GET /spreadsheet`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "id": "<string>"
}
```

### Request Response

```json
{
  "spreadsheetId": "<string>",
  "properties": "<object>",
  "sheets": [
    "<object>"
  ],
  "namedRanges": [
    "<object>"
  ],
  "spreadsheetUrl": "<string>",
  "developerMetadata": [
    "<object>"
  ],
  "dataSources": [
    "<object>"
  ],
  "dataSourceSchedules": [
    "<object>"
  ]
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/google-sheet/actions/fetch-spreadsheet.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/google-sheet/actions/fetch-spreadsheet.md)

<!-- END  GENERATED CONTENT -->

