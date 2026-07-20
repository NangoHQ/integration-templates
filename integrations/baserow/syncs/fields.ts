import { createSync } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    tableId: z.number().int().positive()
});

const ProviderFieldSchema = z
    .object({
        id: z.number().int()
    })
    .passthrough();

const FieldSchema = z
    .object({
        id: z.string()
    })
    .passthrough();

const sync = createSync({
    description: 'Sync field (column) definitions for a configured table',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    models: {
        Field: FieldSchema
    },

    exec: async (nango) => {
        const metadataResult = MetadataSchema.safeParse(await nango.getMetadata());
        if (!metadataResult.success) {
            throw new Error(`Invalid metadata: ${metadataResult.error.message}`);
        }

        const tableId = metadataResult.data.tableId;

        // https://api.baserow.io/api/redoc/
        const response = await nango.get({
            endpoint: `/database/fields/table/${encodeURIComponent(String(tableId))}/`,
            retries: 3
        });

        const fieldsResult = z.array(ProviderFieldSchema).safeParse(response.data);
        if (!fieldsResult.success) {
            throw new Error(`Invalid fields response: ${fieldsResult.error.message}`);
        }

        await nango.trackDeletesStart('Field');

        const fields = fieldsResult.data.map((field) => {
            const { id, ...rest } = field;
            return {
                id: String(id),
                ...rest
            };
        });

        if (fields.length > 0) {
            await nango.batchSave(fields, 'Field');
        }

        await nango.trackDeletesEnd('Field');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
