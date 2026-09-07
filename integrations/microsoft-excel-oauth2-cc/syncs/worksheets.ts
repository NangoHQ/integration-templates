import { createSync } from 'nango';
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

const CheckpointSchema = z.object({
    resumeUrl: z.string()
});

const WorksheetsResponseSchema = z.object({
    value: z.array(ProviderWorksheetSchema),
    '@odata.nextLink': z.string().optional()
});

const sync = createSync({
    description: 'Sync the worksheets within a specific workbook.',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
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

        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = CheckpointSchema.parse(rawCheckpoint ?? { resumeUrl: '' });

        const initialEndpoint = `/v1.0/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(itemId)}/workbook/worksheets`;
        const initialParams = { $top: 100 };

        let nextUrl: string | undefined = checkpoint.resumeUrl;

        // Safe to call every execution: trackDeletesStart() will not overwrite the
        // start of a delete-tracking window this refresh already opened.
        await nango.trackDeletesStart('Worksheet');

        while (true) {
            let response;
            if (nextUrl) {
                const url = new URL(nextUrl);
                response = await nango.get({
                    endpoint: `${url.pathname}${url.search}`,
                    baseUrlOverride: `${url.protocol}//${url.host}`,
                    retries: 3
                });
            } else {
                // https://learn.microsoft.com/en-us/graph/api/worksheet-list
                response = await nango.get({
                    endpoint: initialEndpoint,
                    params: initialParams,
                    retries: 3
                });
            }

            const parsedResponse = WorksheetsResponseSchema.safeParse(response.data);

            if (!parsedResponse.success) {
                throw new Error(`Failed to parse worksheets response: ${parsedResponse.error.message}`);
            }

            const data = parsedResponse.data;
            const worksheets = data.value.map((worksheet) => ({
                id: `${itemId}_${worksheet.id}`,
                ...(worksheet.name != null && { name: worksheet.name }),
                ...(worksheet.position != null && { position: worksheet.position }),
                ...(worksheet.visibility != null && { visibility: worksheet.visibility })
            }));

            if (worksheets.length > 0) {
                await nango.batchSave(worksheets, 'Worksheet');
            }

            if (data['@odata.nextLink']) {
                await nango.saveCheckpoint({ resumeUrl: data['@odata.nextLink'] });
                nextUrl = data['@odata.nextLink'];
                continue;
            }

            break;
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Worksheet');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
