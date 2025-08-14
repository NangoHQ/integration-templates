<!-- BEGIN GENERATED CONTENT -->
# List Drives

## General Information

- **Description:** Lists all shared drives the user has access to. Returns paginated results with up to 100 drives per page.
- **Version:** 2.0.0
- **Group:** Drives
- **Scopes:** `https://www.googleapis.com/auth/drive.readonly`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_google_drive_listdrives`
- **Input Model:** `ActionInput_google_drive_listdrives`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/google-drive/actions/list-drives.ts)


## Endpoint Reference

### Request Endpoint

`GET /drives`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "cursor": "<string>"
}
```

### Request Response

```json
{
  "drives": [
    {
      "id": "<string>",
      "name": "<string>",
      "kind": "<string>",
      "createdTime": "<string>",
      "hidden": "<boolean>",
      "capabilities": {
        "canAddChildren": "<boolean>",
        "canComment": "<boolean>",
        "canCopy": "<boolean>",
        "canDeleteDrive": "<boolean>",
        "canDownload": "<boolean>",
        "canEdit": "<boolean>",
        "canListChildren": "<boolean>",
        "canManageMembers": "<boolean>",
        "canReadRevisions": "<boolean>",
        "canRename": "<boolean>",
        "canShare": "<boolean>",
        "canTrashChildren": "<boolean>",
        "canRenameDrive": "<boolean>",
        "canChangeDriveBackground": "<boolean>",
        "canChangeCopyRequiresWriterPermissionRestriction": "<boolean>",
        "canChangeDomainUsersOnlyRestriction": "<boolean>",
        "canChangeDriveMembersOnlyRestriction": "<boolean>",
        "canChangeSharingFoldersRequiresOrganizerPermissionRestriction": "<boolean>",
        "canResetDriveRestrictions": "<boolean>",
        "canDeleteChildren": "<boolean>"
      },
      "restrictions": {
        "adminManagedRestrictions": "<boolean>",
        "copyRequiresWriterPermission": "<boolean>",
        "domainUsersOnly": "<boolean>",
        "driveMembersOnly": "<boolean>",
        "sharingFoldersRequiresPublisherPermission": "<boolean>",
        "sharingFoldersRequiresOrganizerPermission": "<boolean>"
      }
    }
  ],
  "next_cursor": "<string>",
  "kind": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/google-drive/actions/list-drives.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/google-drive/actions/list-drives.md)

<!-- END  GENERATED CONTENT -->

