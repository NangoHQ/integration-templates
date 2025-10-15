import type { DriveItem } from '../types.js';

export function toFile(item: DriveItem, driveId: string): any {
    const isFolder = !!item.folder;
    const path = item.parentReference?.path ? `${item.parentReference.path}/${item.name}` : `/${item.name}`;

    const { ['@content.downloadUrl']: _downloadUrl, ...sanitizedRaw } = item as any;

    return {
        id: item.id,
        name: item.name,
        etag: item.eTag,
        cTag: item.cTag,
        is_folder: isFolder,
        mime_type: item.file?.mimeType || null,
        path,
        raw_source: sanitizedRaw,
        updated_at: item.lastModifiedDateTime,
        created_at: item.createdDateTime,
        blob_size: item.size,
        drive_id: driveId
    };
}


