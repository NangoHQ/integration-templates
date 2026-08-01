import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    driveId: z.string(),
    itemId: z.string()
});

const WorksheetSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    position: z.number().optional(),
    visibility: z.string().optional()
});

const ProviderWorksheetSchema = z.object({
    id: z.string(),
    name: z.string().optional().nullable(),
    position: z.number().optional().nullable(),
    visibility: z.string().optional().nullable()
});

const sync = createSync({
    description: 'Sync the worksheets within a specific workbook.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    models: {
        Worksheet: WorksheetSchema
    },

    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.safeParse(metadata);

        if (!parsedMetadata.success) {
            throw new Error(`Invalid metadata: ${parsedMetadata.error.message}`);
        }

        const { driveId, itemId } = parsedMetadata.data;

        await nango.trackDeletesStart('Worksheet');

        const proxyConfig: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/graph/api/worksheet-list
            endpoint: `/v1.0/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(itemId)}/workbook/worksheets`,
            paginate: {
                type: 'link',
                link_path_in_response_body: '@odata.nextLink',
                response_path: 'value',
                limit: 100,
                limit_name_in_request: '$top'
            },
            retries: 3
        };

        for await (const batch of nango.paginate(proxyConfig)) {
            const parsedBatch = z.array(ProviderWorksheetSchema).safeParse(batch);

            if (!parsedBatch.success) {
                throw new Error(`Failed to parse worksheets batch: ${parsedBatch.error.message}`);
            }

            const worksheets = parsedBatch.data.map((worksheet) => ({
                id: `${itemId}_${worksheet.id}`,
                ...(worksheet.name != null && { name: worksheet.name }),
                ...(worksheet.position != null && { position: worksheet.position }),
                ...(worksheet.visibility != null && { visibility: worksheet.visibility })
            }));

            if (worksheets.length > 0) {
                await nango.batchSave(worksheets, 'Worksheet');
            }
        }

        await nango.trackDeletesEnd('Worksheet');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
