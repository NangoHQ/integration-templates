import type { FileMetadata } from '../../models';
import type { DriveItem } from '../types';

/**
 * Maps a DriveItem to the standardized FileMetadata format
 * @param item - The DriveItem from OneDrive API
 * @param driveId - The ID of the drive containing the file
 * @returns The mapped FileMetadata object
 */
export function toFile(item: DriveItem, driveId: string): FileMetadata {
    const isFolder = !!item.folder;
    const path = item.parentReference?.path ? `${item.parentReference.path}/${item.name}` : `/${item.name}`;

    return {
        id: item.id,
        name: item.name,
        etag: item.eTag,
        cTag: item.cTag,
        is_folder: isFolder,
        mime_type: item.file?.mimeType || null,
        path,
        raw_source: item,
        updated_at: item.lastModifiedDateTime,
        download_url: item['@microsoft.graph.downloadUrl'] || null,
        created_at: item.createdDateTime,
        blob_size: item.size,
        drive_id: driveId
    };
}
