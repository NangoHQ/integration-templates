# Documents

## General Information

- **Description:** Sync the metadata of a specified file or folders from Google Drive,
handling both individual files and nested folders.
Metadata required to filter on a particular folder, or file(s). Metadata
fields should be {"files": ["<some-id>"]} OR
{"folders": ["<some-id>"]}. The ID should be able to be provided
by using the Google Picker API
(https://developers.google.com/drive/picker/guides/overview)
and using the ID field provided by the response
(https://developers.google.com/drive/picker/reference/results)

- **Version:** 1.0.3
- **Group:** Others
- **Scopes:**: https://www.googleapis.com/auth/drive.readonly
- **Endpoint Type:** Sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/google-drive/syncs/documents.ts)

## Endpoint Reference

### Request Endpoint

- **Path:** /documents
- **Method:** GET
