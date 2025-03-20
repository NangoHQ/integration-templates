<!-- START GENERATED CONTENT -->

# User Files Selection

**Description:** Fetch selected files from a user's OneDrive based on provided metadata.

**Group:** Files
**Scopes:** `Files.Read, Files.Read.All, offline_access`
**Endpoint Type:** Sync
**Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/one-drive/syncs/user-files-selection.ts)


## Endpoint Reference

This sync fetches selected files from a user's OneDrive based on provided metadata. It allows for selective syncing of specific files and folders.

### Input schema

```typescript
{
  drives: string[]; // Optional array of drive IDs
  pickedFiles: [
    {
      driveId: string; // The ID of the drive containing the files
      fileIds: string[]; // Array of file/folder IDs to sync
    }
  ]
}
```

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
// First, set the metadata for the sync
await nango.setMetadata({
  provider: 'one-drive',
  connectionId: '<CONNECTION-ID>',
  syncName: 'user-files-selection',
  metadata: {
    pickedFiles: [
      {
        driveId: 'drive123',
        fileIds: ['file456', 'folder789']
      }
    ]
  }
});

// Then, start the sync
await nango.startSync({
  provider: 'one-drive',
  connectionId: '<CONNECTION-ID>',
  syncName: 'user-files-selection'
});

// Later, retrieve the synced records
const result = await nango.listRecords({
  provider: 'one-drive',
  connectionId: '<CONNECTION-ID>',
  model: 'FileMetadata'
});
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/one-drive/syncs/user-files-selection.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/one-drive/syncs/user-files-selection.md)

<!-- END GENERATED CONTENT -->
