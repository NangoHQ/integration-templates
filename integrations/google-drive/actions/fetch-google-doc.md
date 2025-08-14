<!-- BEGIN GENERATED CONTENT -->
# Fetch Google Doc

## General Information

- **Description:** Fetches the content of a native google document given its ID. Outputs
a JSON reprensentation of a google doc.
- **Version:** 1.0.0
- **Group:** Documents
- **Scopes:** `https://www.googleapis.com/auth/drive.readonly`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_google_drive_fetchgoogledoc`
- **Input Model:** `ActionInput_google_drive_fetchgoogledoc`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/google-drive/actions/fetch-google-doc.ts)


## Endpoint Reference

### Request Endpoint

`GET /fetch-google-document`

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
  "documentId": "<string>",
  "title": "<string>",
  "url": "<string>",
  "tabs": [
    {}
  ],
  "revisionId": "<string>",
  "suggestionsViewMode": "<enum: 'DEFAULT_FOR_CURRENT_ACCESS' | 'SUGGESTIONS_INLINE' | 'PREVIEW_SUGGESTIONS_ACCEPTED' | 'PREVIEW_WITHOUT_SUGGESTIONS'>",
  "body": {},
  "headers": {},
  "footers": {},
  "footnotes": {},
  "documentStyle": {},
  "suggestedDocumentStyleChanges": {},
  "namedStyles": {},
  "suggestedNamedStylesChanges": {},
  "lists": {},
  "namedRanges": {},
  "inlineObjects": {},
  "positionedObjects": {}
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/google-drive/actions/fetch-google-doc.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/google-drive/actions/fetch-google-doc.md)

<!-- END  GENERATED CONTENT -->

