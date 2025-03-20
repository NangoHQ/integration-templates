<!-- START GENERATED CONTENT -->

# User Files

**Description:** Fetch all files from the user's OneDrive and sync the metadata for each file.

**Group:** Files
**Scopes:** `Files.Read, Files.Read.All, offline_access`
**Endpoint Type:** Sync
**Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/one-drive/syncs/user-files.ts)


## Endpoint Reference

This sync fetches all files from the user's OneDrive and syncs the metadata for each file. It recursively traverses folders up to a depth of 3 levels.

### Output schema

```typescript
{
  id: string;            // The ID of the file
  name: string;          // The name of the file
  etag: string;          // The ETag of the file
  cTag: string;          // The CTag of the file
  is_folder: boolean;    // Whether the item is a folder
  mime_type: string | null; // The MIME type of the file, null for folders
  path: string;          // The path to the file
  raw_source: object;    // The raw API response
  updated_at: string;    // When the file was last updated
  download_url: string | null; // The URL to download the file, null for folders
  created_at: string;    // When the file was created
  blob_size: number;     // The size of the file in bytes
  drive_id: string;      // The ID of the drive containing the file
}
```

## Example

```typescript
const result = await nango.listRecords({
  provider: 'one-drive',
  connectionId: '<CONNECTION-ID>',
  model: 'FileMetadata'
});
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/one-drive/syncs/user-files.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/one-drive/syncs/user-files.md)

<!-- END GENERATED CONTENT -->
