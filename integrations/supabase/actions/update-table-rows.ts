import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    table: z.string().min(1).describe('Table name to update. Example: "nango_test"'),
    updates: z.record(z.string(), z.unknown()).describe('Object containing column updates.'),
    filters: z.record(z.string(), z.string()).describe('PostgREST filters as query params. Example: {"id":"eq.964cc467-144e-4215-b7d0-d124607a6d72"}')
});

const ConnectionConfigSchema = z
    .object({
        projectUrl: z.string().optional()
    })
    .passthrough();

const ProviderRowSchema = z.record(z.string(), z.unknown());

const OutputSchema = z.array(ProviderRowSchema);

const action = createAction({
    description: 'Update rows in a Supabase table.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-table-rows',
        group: 'Tables'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (Object.keys(input.filters).length === 0) {
            throw new nango.ActionError({
                type: 'validation_error',
                message: 'At least one filter is required to prevent updating all rows.'
            });
        }

        const connection = await nango.getConnection();
        const rawConfig = typeof connection.connection_config === 'object' && connection.connection_config !== null ? connection.connection_config : {};
        const connectionConfig = ConnectionConfigSchema.parse(rawConfig);
        const projectUrl = connectionConfig.projectUrl;
        const baseUrlOverride = projectUrl ? (projectUrl.startsWith('http') ? projectUrl : `https://${projectUrl}`) : undefined;

        // https://supabase.com/docs/reference/api/patch-tablerows
        const response = await nango.patch({
            endpoint: `/rest/v1/${encodeURIComponent(input.table)}`,
            params: input.filters,
            headers: {
                Prefer: 'return=representation'
            },
            data: input.updates,
            retries: 1,
            baseUrlOverride
        });

        const rows = z.array(ProviderRowSchema).parse(response.data);
        return rows;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
