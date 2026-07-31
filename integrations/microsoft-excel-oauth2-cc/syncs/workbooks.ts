import { createSync } from 'nango';
import { z } from 'zod';

const WorkbookSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    webUrl: z.string().optional(),
    downloadUrl: z.string().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional(),
    size: z.number().optional(),
    mimeType: z.string().optional()
});

const MetadataSchema = z.object({
    driveId: z.string()
});

const CheckpointSchema = z.object({
    resumeUrl: z.string()
});

const DeltaResponseSchema = z.object({
    value: z.array(z.unknown()),
    '@odata.nextLink': z.string().optional(),
    '@odata.deltaLink': z.string().optional()
});

function getHeaderValue(headers: Record<string, unknown> | undefined, name: string): string | undefined {
    if (!headers) {
        return undefined;
    }

    const lowerName = name.toLowerCase();
    for (const [key, value] of Object.entries(headers)) {
        if (key.toLowerCase() !== lowerName) {
            continue;
        }

        if (typeof value === 'string') {
            return value;
        }
    }

    return undefined;
}

const DriveItemSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    webUrl: z.string().optional(),
    '@microsoft.graph.downloadUrl': z.string().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional(),
    size: z.number().optional(),
    file: z
        .object({
            mimeType: z.string().optional()
        })
        .optional()
        .nullable(),
    deleted: z.unknown().optional()
});

const sync = createSync({
    description: 'Sync .xlsx files within a drive',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        Workbook: WorkbookSchema
    },

    exec: async (nango) => {
        const rawMetadata = await nango.getMetadata();
        const metadata = MetadataSchema.parse(rawMetadata);

        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = CheckpointSchema.parse(rawCheckpoint ?? { resumeUrl: '' });

        let nextUrl = checkpoint.resumeUrl || `https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(metadata.driveId)}/root/delta?$top=100`;

        while (true) {
            const url = new URL(nextUrl);
            const endpoint = `${url.pathname}${url.search}`;
            const baseUrlOverride = `${url.protocol}//${url.host}`;

            // https://learn.microsoft.com/en-us/graph/api/driveitem-delta
            const response = await nango.get({
                endpoint,
                baseUrlOverride,
                retries: 3
            });

            if (response.status === 410) {
                const location = getHeaderValue(response.headers, 'location');
                if (!location) {
                    throw new Error('Delta token expired, but no replacement location was returned.');
                }

                nextUrl = location;
                continue;
            }

            const parsedResponse = DeltaResponseSchema.safeParse(response.data);
            if (!parsedResponse.success) {
                throw new Error(`Failed to parse delta response: ${parsedResponse.error.message}`);
            }

            const data = parsedResponse.data;
            const items = data.value;

            const upserts: z.infer<typeof WorkbookSchema>[] = [];
            const deletions: { id: string }[] = [];

            for (const rawItem of items) {
                const parsedItem = DriveItemSchema.safeParse(rawItem);
                if (!parsedItem.success) {
                    throw new Error(`Failed to parse drive item: ${parsedItem.error.message}`);
                }

                const item = parsedItem.data;

                if (item.deleted !== undefined) {
                    deletions.push({ id: item.id });
                    continue;
                }

                if (item.file?.mimeType !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
                    continue;
                }

                upserts.push({
                    id: item.id,
                    name: item.name,
                    webUrl: item.webUrl,
                    downloadUrl: item['@microsoft.graph.downloadUrl'],
                    createdDateTime: item.createdDateTime,
                    lastModifiedDateTime: item.lastModifiedDateTime,
                    size: item.size,
                    mimeType: item.file.mimeType
                });
            }

            if (upserts.length > 0) {
                await nango.batchSave(upserts, 'Workbook');
            }

            if (deletions.length > 0) {
                await nango.batchDelete(deletions, 'Workbook');
            }

            const resumeUrl = data['@odata.nextLink'] ?? data['@odata.deltaLink'];
            if (resumeUrl) {
                await nango.saveCheckpoint({ resumeUrl });
            }

            if (data['@odata.deltaLink']) {
                break;
            }

            if (data['@odata.nextLink']) {
                nextUrl = data['@odata.nextLink'];
                continue;
            }

            break;
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
