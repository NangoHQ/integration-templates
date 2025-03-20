<!-- START GENERATED CONTENT -->

# List Drives

**Description:** Lists the available drives for the authenticated user.

**Group:** Drives
**Scopes:** `Files.Read, offline_access`
**Endpoint Type:** Action
**Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/one-drive/actions/list-drives.ts)


## Endpoint Reference

This action lists all available drives for the authenticated user in OneDrive.

### Output schema

```typescript
{
  drives: [
    {
      id: string;            // The ID of the drive
      name: string;          // The name of the drive
      createdDateTime: string; // When the drive was created
      webUrl: string;        // URL to access the drive in a browser
    }
  ]
}
```

## Example

```typescript
const result = await nango.trigger({
  provider: 'one-drive',
  connectionId: '<CONNECTION-ID>',
  action: 'list-drives'
});
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/one-drive/actions/list-drives.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/one-drive/actions/list-drives.md)

<!-- END GENERATED CONTENT -->
