import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    model: z.string().describe('Odoo model name. Example: "res.partner"')
});

const FieldMetadataSchema = z
    .object({
        string: z.string(),
        type: z.string()
    })
    .passthrough();

const OutputSchema = z.record(z.string(), FieldMetadataSchema);

const action = createAction({
    description: 'Fetch Odoo fields metadata for a model.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const database = metadata?.['database'];

        if (!database || typeof database !== 'string') {
            throw new nango.ActionError({
                type: 'missing_connection_config',
                message: 'Missing required database in connection metadata.'
            });
        }

        const connection = await nango.getConnection();
        const serverUrl = connection.connection_config?.['serverUrl'];
        const apiKey = connection.credentials?.type === 'API_KEY' ? connection.credentials.apiKey : undefined;

        const headers: Record<string, string> = {
            'x-odoo-database': database
        };
        if (apiKey) {
            headers['Authorization'] = `Bearer ${apiKey}`;
        }

        const response = await nango.post({
            // https://www.odoo.com/documentation/19.0/developer/reference/external_api.html
            endpoint: `json/2/${encodeURIComponent(input.model)}/fields_get`,
            ...(serverUrl && { baseUrlOverride: `https://${serverUrl}` }),
            data: {
                attributes: ['string', 'type']
            },
            headers,
            retries: 3
        });

        let data: unknown = response.data;
        if (typeof data === 'string') {
            data = JSON.parse(data);
        }

        const parsed = OutputSchema.parse(data);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
