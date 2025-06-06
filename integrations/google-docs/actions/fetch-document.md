<!-- BEGIN GENERATED CONTENT -->
# Fetch Document

## General Information

- **Description:** Fetches the content of a document given its ID.

- **Version:** 1.0.0
- **Group:** Others
- **Scopes:** `https://www.googleapis.com/auth/documents.readonly`
- **Endpoint Type:** Action
- **Model:** `Document`
- **Input Model:** `DocumentId`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/google-docs/actions/fetch-document.ts)


## Endpoint Reference

### Request Endpoint

`GET /fetch-document`

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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/google-docs/actions/fetch-document.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/google-docs/actions/fetch-document.md)

<!-- END  GENERATED CONTENT -->
## Additional Information
The return type of this action is JSON. Users can convert the JSON response to any file format as needed once the action returns. This flexibility allows for various use cases, such as converting the response to a Base64 string, CSV, or other formats for further processing or analysis.
