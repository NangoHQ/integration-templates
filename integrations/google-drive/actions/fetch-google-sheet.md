<!-- BEGIN GENERATED CONTENT -->
# Fetch Google Sheet

## General Information

- **Description:** Fetches the content of a native google spreadsheet given its ID. Outputs
a JSON representation of a google sheet.
- **Version:** 1.0.0
- **Group:** Documents
- **Scopes:** `https://www.googleapis.com/auth/drive.readonly`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_google_drive_fetchgooglesheet`
- **Input Model:** `ActionInput_google_drive_fetchgooglesheet`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/google-drive/actions/fetch-google-sheet.ts)


## Endpoint Reference

### Request Endpoint

`GET /fetch-google-sheet`

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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/google-drive/actions/fetch-google-sheet.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/google-drive/actions/fetch-google-sheet.md)

<!-- END  GENERATED CONTENT -->

