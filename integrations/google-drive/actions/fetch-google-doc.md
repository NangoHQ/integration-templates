<!-- BEGIN GENERATED CONTENT -->
# Fetch Google Doc

## General Information

- **Description:** Fetches the content of a native google document given its ID. Outputs 
a JSON reprensentation of a google doc.

- **Version:** 0.0.1
- **Group:** Documents
- **Scopes:** `https://www.googleapis.com/auth/drive.readonly`
- **Endpoint Type:** Action
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
    "<object>"
  ],
  "revisionId": "<string>",
  "suggestionsViewMode": "<DEFAULT_FOR_CURRENT_ACCESS | SUGGESTIONS_INLINE | PREVIEW_SUGGESTIONS_ACCEPTED\t| PREVIEW_WITHOUT_SUGGESTIONS>",
  "body": "<object>",
  "headers": "<object>",
  "footers": "<object>",
  "footnotes": "<object>",
  "documentStyle": "<object>",
  "suggestedDocumentStyleChanges": "<object>",
  "namedStyles": "<object>",
  "suggestedNamedStylesChanges": "<object>",
  "lists": "<object>",
  "namedRanges": "<object>",
  "inlineObjects": "<object>",
  "positionedObjects": "<object>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/google-drive/actions/fetch-google-doc.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/google-drive/actions/fetch-google-doc.md)

<!-- END  GENERATED CONTENT -->

