import { createSync } from 'nango';
import { z } from 'zod';

const ProviderMetadataFieldSchema = z.object({
    name: z.string(),
    state: z.enum(['active', 'delete', 'index']),
    view_template: z.string()
});

const MetadataFieldSchema = z.object({
    id: z.string(),
    name: z.string(),
    state: z.enum(['active', 'delete', 'index']),
    view_template: z.string().optional()
});

const sync = createSync({
    description: 'Sync all custom metadata field definitions configured on this account.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        MetadataField: MetadataFieldSchema
    },

    exec: async (nango) => {
        // https://mailchimp.com/developer/transactional/api/metadata/list-metadata-fields/
        const response = await nango.post({
            endpoint: '/1.0/metadata/list',
            data: {},
            retries: 3
        });

        const rawFields = z.array(ProviderMetadataFieldSchema).safeParse(response.data);
        if (!rawFields.success) {
            throw new Error(`Failed to parse metadata fields: ${rawFields.error.message}`);
        }

        await nango.trackDeletesStart('MetadataField');

        const fields = rawFields.data.map((field) => {
            const record = {
                id: field.name,
                name: field.name,
                state: field.state
            };
            if (field.view_template) {
                return { ...record, view_template: field.view_template };
            }
            return record;
        });

        if (fields.length > 0) {
            await nango.batchSave(fields, 'MetadataField');
        }

        await nango.trackDeletesEnd('MetadataField');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
