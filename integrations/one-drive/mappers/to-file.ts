import type { DriveItem } from '../types.js';

/**
 * Maps a DriveItem to the standardized OneDriveFile format
 * @param item - The DriveItem from OneDrive API
 * @param driveId - The ID of the drive containing the file
 * @returns The mapped OneDriveFile object
 */
export function toFile(item: DriveItem, driveId: string): any {
    const isFolder = !!item.folder;
    const path = item.parentReference?.path ? `${item.parentReference.path}/${item.name}` : `/${item.name}`;

    const { ['@microsoft.graph.downloadUrl']: _downloadUrl, ...sanitizedRaw } = item;

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
