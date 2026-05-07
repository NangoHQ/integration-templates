import { createSync } from 'nango';
import { z } from 'zod';

/**
 * Schema for metadata input containing drives and picked files
 */
const MetadataSchema = z.object({
    drives: z.array(
        z.object({
            id: z.string().describe('Drive ID'),
            name: z.string().optional().describe('Drive name')
        })
    ),
    pickedFiles: z.array(
        z.object({
            driveId: z.string().describe('Drive ID containing the file'),
            id: z.string().describe('DriveItem ID'),
            name: z.string().optional().describe('File name')
        })
    )
});

/**
 * Schema for the UserFile model
 */
const UserFileSchema = z.object({
    id: z.string().describe('Unique file identifier (driveId + fileId)'),
    driveId: z.string().describe('Drive ID'),
    driveItemId: z.string().describe('DriveItem ID'),
    name: z.string().optional().describe('File name'),
    webUrl: z.string().optional().describe('Web URL to the file'),
    downloadUrl: z.string().optional().describe('Download URL'),
    size: z.number().optional().describe('File size in bytes'),
    createdDateTime: z.string().optional().describe('Creation timestamp'),
    lastModifiedDateTime: z.string().optional().describe('Last modification timestamp'),
    mimeType: z.string().optional().describe('MIME type'),
    parentReferenceId: z.string().optional().describe('Parent folder ID'),
    parentReferenceName: z.string().optional().describe('Parent folder name'),
    parentReferencePath: z.string().optional().describe('Parent folder path')
});

/**
 * Provider response schema for a drive item
 */
const DriveItemSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    webUrl: z.string().optional(),
    size: z.number().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional(),
    file: z
        .object({
            mimeType: z.string().optional()
        })
        .optional(),
    folder: z.object({}).optional(),
    parentReference: z
        .object({
            id: z.string().optional(),
            name: z.string().optional(),
            path: z.string().optional()
        })
        .optional(),
    '@microsoft.graph.downloadUrl': z.string().optional()
});

const sync = createSync({
    description: 'Sync selected OneDrive files from metadata',
    version: '2.0.0',
    frequency: 'every hour',
    autoStart: false,
    models: {
        SelectedUserFile: UserFileSchema
    },
    endpoints: [{ method: 'POST', path: '/syncs/user-files-selection' }],
    scopes: ['Files.Read', 'offline_access'],

    exec: async (nango) => {
        // Get metadata with drives and picked files
        const rawMetadata = await nango.getMetadata();
        const metadataResult = MetadataSchema.safeParse(rawMetadata);

        if (!metadataResult.success) {
            throw new nango.ActionError({
                message: 'Invalid metadata: required fields are drives and pickedFiles'
            });
        }

        const metadata = metadataResult.data;

        if (metadata.pickedFiles.length === 0) {
            await nango.log('No files selected for sync');
            return;
        }

        // Validate picked files belong to known drives
        for (const pickedFile of metadata.pickedFiles) {
            const driveExists = metadata.drives.some((drive) => drive.id === pickedFile.driveId);
            if (!driveExists) {
                throw new nango.ActionError({
                    message: `Drive ${pickedFile.driveId} not found in metadata.drives for file ${pickedFile.id}`
                });
            }
        }

        // Track deletes to remove files that are no longer selected
        await nango.trackDeletesStart('SelectedUserFile');
        let fetchErrorCount = 0;

        const files: Array<{
            id: string;
            driveId: string;
            driveItemId: string;
            name?: string;
            webUrl?: string;
            downloadUrl?: string;
            size?: number;
            createdDateTime?: string;
            lastModifiedDateTime?: string;
            mimeType?: string;
            parentReferenceId?: string;
            parentReferenceName?: string;
            parentReferencePath?: string;
        }> = [];

        for (const pickedFile of metadata.pickedFiles) {
            // @allowTryCatch Continue processing other files if one fails
            // Individual file failures should not block the entire sync
            try {
                // https://learn.microsoft.com/graph/api/driveitem-get
                const response = await nango.get({
                    endpoint: `/v1.0/drives/${encodeURIComponent(pickedFile.driveId)}/items/${encodeURIComponent(pickedFile.id)}`,
                    retries: 3
                });

                const parseResult = DriveItemSchema.safeParse(response.data);
                if (!parseResult.success) {
                    throw new Error(`Failed to parse drive item ${pickedFile.id}: ${parseResult.error.message}`);
                }

                const item = parseResult.data;

                // Build file record with optional fields
                const fileRecord: {
                    id: string;
                    driveId: string;
                    driveItemId: string;
                    name?: string;
                    webUrl?: string;
                    downloadUrl?: string;
                    size?: number;
                    createdDateTime?: string;
                    lastModifiedDateTime?: string;
                    mimeType?: string;
                    parentReferenceId?: string;
                    parentReferenceName?: string;
                    parentReferencePath?: string;
                } = {
                    id: `${pickedFile.driveId}:${item.id}`,
                    driveId: pickedFile.driveId,
                    driveItemId: item.id
                };

                if (item.name) {
                    fileRecord.name = item.name;
                }
                if (item.webUrl) {
                    fileRecord.webUrl = item.webUrl;
                }
                if (item['@microsoft.graph.downloadUrl']) {
                    fileRecord.downloadUrl = item['@microsoft.graph.downloadUrl'];
                }
                if (item.size !== undefined) {
                    fileRecord.size = item.size;
                }
                if (item.createdDateTime) {
                    fileRecord.createdDateTime = item.createdDateTime;
                }
                if (item.lastModifiedDateTime) {
                    fileRecord.lastModifiedDateTime = item.lastModifiedDateTime;
                }
                if (item.file?.mimeType) {
                    fileRecord.mimeType = item.file.mimeType;
                }
                if (item.parentReference?.id) {
                    fileRecord.parentReferenceId = item.parentReference.id;
                }
                if (item.parentReference?.name) {
                    fileRecord.parentReferenceName = item.parentReference.name;
                }
                if (item.parentReference?.path) {
                    fileRecord.parentReferencePath = item.parentReference.path;
                }

                files.push(fileRecord);
                await nango.log(`Processed file: ${fileRecord.name ?? fileRecord.id}`);
            } catch (error) {
                fetchErrorCount++;
                await nango.log(
                    `Warning: Failed to fetch file ${pickedFile.id} from drive ${pickedFile.driveId}: ${error instanceof Error ? error.message : String(error)}`
                );
            }
        }

        // Guard: if every file fetch failed, abort rather than calling trackDeletesEnd with
        // no saves, which would mass-delete all previously synced records.
        if (fetchErrorCount === metadata.pickedFiles.length) {
            throw new Error('All file fetches failed; aborting sync to prevent accidental data loss from delete tracking');
        }

        // Save all files
        if (files.length > 0) {
            await nango.batchSave(files, 'SelectedUserFile');
        }

        // End delete tracking - files no longer in selection will be deleted
        await nango.trackDeletesEnd('SelectedUserFile');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
