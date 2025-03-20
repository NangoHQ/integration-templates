<!-- START GENERATED CONTENT -->

# Fetch File

**Description:** This action will be used to fetch the latest file download_url which can be used to download the actual file.

**Group:** Files
**Scopes:** `Files.Read, offline_access`
**Endpoint Type:** Action
**Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/one-drive/actions/fetch-file.ts)


## Endpoint Reference

This action fetches a file's download URL from OneDrive. The URL can be used to download the actual file content.

### Input schema

```typescript
{
  driveId: string; // The ID of the drive containing the file
  itemId: string;  // The ID of the file to fetch
}
```

### Output schema

```typescript
{
  id: string;            // The ID of the file
  download_url: string | null; // The URL to download the file, or null if not available
}
```

## Example

```typescript
const result = await nango.trigger({
  provider: 'one-drive',
  connectionId: '<CONNECTION-ID>',
  action: 'fetch-file',
  input: {
    driveId: 'drive123',
    itemId: 'file456'
  }
});
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/one-drive/actions/fetch-file.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/one-drive/actions/fetch-file.md)

<!-- END GENERATED CONTENT -->
