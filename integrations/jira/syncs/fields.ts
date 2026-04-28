import { createSync } from 'nango';
import { z } from 'zod';

// Field schema sub-components
const FieldSchemaSchema = z.object({
    type: z.string(),
    system: z.string().optional(),
    custom: z.string().optional(),
    customId: z.number().optional()
});

const FieldSchema = z.object({
    id: z.string(),
    name: z.string(),
    custom: z.boolean(),
    key: z.string().optional(),
    clauseNames: z.array(z.string()).optional(),
    orderable: z.boolean().optional(),
    navigable: z.boolean().optional(),
    searchable: z.boolean().optional(),
    schema: FieldSchemaSchema.optional(),
    description: z.string().optional(),
    untranslatedName: z.string().optional()
});

// Full refresh sync - fields API does not support incremental filtering
const sync = createSync({
    description: 'Sync Jira field metadata available to the authenticated user.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Field: FieldSchema
    },

    endpoints: [
        {
            path: '/syncs/fields',
            method: 'POST'
        }
    ],

    exec: async (nango) => {
        // Get cloudId from connection config or metadata
        // https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/
        const connection = await nango.getConnection();
        let cloudId = connection.connection_config?.['cloudId'];

        if (!cloudId || typeof cloudId !== 'string') {
            const metadata = await nango.getMetadata();
            cloudId = metadata?.['cloudId'];
        }

        if (!cloudId || typeof cloudId !== 'string') {
            throw new Error('cloudId is required in connection config or metadata');
        }

        // Full refresh: start tracking deletions
        await nango.trackDeletesStart('Field');

        // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-fields/#api-rest-api-3-field-get
        const response = await nango.get({
            endpoint: `/ex/jira/${cloudId}/rest/api/3/field`,
            headers: {
                'X-Atlassian-Token': 'no-check'
            },
            retries: 3
        });

        // Parse and validate the response data
        const rawData = response.data;
        if (!Array.isArray(rawData)) {
            throw new Error('Invalid response: expected array of fields');
        }

        const fields: z.infer<typeof FieldSchema>[] = [];
        for (const item of rawData) {
            const parseResult = FieldSchema.safeParse(item);
            if (!parseResult.success) {
                throw new Error(`Failed to parse Jira field: ${parseResult.error.message}`);
            }
            fields.push(parseResult.data);
        }

        if (fields.length > 0) {
            await nango.batchSave(fields, 'Field');
        }

        // Full refresh: end tracking deletions
        await nango.trackDeletesEnd('Field');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
