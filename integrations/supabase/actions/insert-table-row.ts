import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    table: z.string().describe('The table name to insert into. Example: "nango_test"'),
    row: z.record(z.string(), z.unknown()).describe('The row object to insert. Example: {"name": "new-record", "value": "delta"}')
});

const OutputSchema = z.array(z.record(z.string(), z.unknown()));

const ConnectionConfigSchema = z.object({
    projectUrl: z.string().optional()
});

const action = createAction({
    description: 'Insert a row into a Supabase table.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/insert-table-row',
        group: 'PostgREST'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const connectionConfig = ConnectionConfigSchema.parse(connection.connection_config || {});
        const rawUrl = connectionConfig.projectUrl;
        const baseUrlOverride = rawUrl ? (rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`) : undefined;

        if (!baseUrlOverride) {
            throw new nango.ActionError({
                type: 'invalid_connection_config',
                message: 'Missing projectUrl in connection configuration.'
            });
        }

        // https://supabase.com/docs/reference/api/postgrest-v1-insert-row
        const response = await nango.post({
            endpoint: `/rest/v1/${encodeURIComponent(input.table)}`,
            data: input.row,
            headers: {
                Prefer: 'return=representation'
            },
            baseUrlOverride,
            retries: 1
        });

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
