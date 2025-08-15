<!-- BEGIN GENERATED CONTENT -->
# Fetch Spreadsheet

## General Information

- **Description:** Fetches the content of a spreadsheet given its ID.
- **Version:** 2.0.0
- **Group:** Others
- **Scopes:** `https://www.googleapis.com/auth/spreadsheets.readonly`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_google_sheet_fetchspreadsheet`
- **Input Model:** `ActionInput_google_sheet_fetchspreadsheet`
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
  "properties": {},
  "sheets": [
    {}
  ],
  "namedRanges": [
    {}
  ],
  "spreadsheetUrl": "<string>",
  "developerMetadata": [
    {}
  ],
  "dataSources": [
    {}
  ],
  "dataSourceSchedules": [
    {}
  ]
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/google-sheet/actions/fetch-spreadsheet.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/google-sheet/actions/fetch-spreadsheet.md)

<!-- END  GENERATED CONTENT -->
## Additional Information
The return type of this action is JSON. Users can convert the JSON response to any file format as needed once the action returns. This flexibility allows for various use cases, such as converting the response to a Base64 string, CSV, or other formats for further processing or analysis.
