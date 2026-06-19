import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    table: z.string().describe('Table name. Example: "nango_test"'),
    row: z.record(z.string(), z.unknown()).describe('Row object to upsert. Must include the primary key column(s) for conflict detection.'),
    on_conflict: z.string().optional().describe('Comma-separated conflict target column(s) if different from the primary key. Example: "name"')
});

const OutputSchema = z.object({
    row: z.record(z.string(), z.unknown()).describe('The upserted row')
});

const action = createAction({
    description: 'Insert or update a row in a Supabase table, merging on conflict.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const connectionConfigSchema = z.object({
            projectUrl: z.string().optional()
        });
        const connectionConfig = connectionConfigSchema.parse(connection.connection_config || {});
        const baseUrlOverride = connectionConfig.projectUrl
            ? connectionConfig.projectUrl.startsWith('http')
                ? connectionConfig.projectUrl
                : `https://${connectionConfig.projectUrl}`
            : undefined;

        const response = await nango.post({
            // https://supabase.com/docs/reference/api
            endpoint: `/rest/v1/${encodeURIComponent(input.table)}`,
            headers: {
                Prefer: 'resolution=merge-duplicates,return=representation'
            },
            params: input.on_conflict ? { on_conflict: input.on_conflict } : {},
            data: input.row,
            baseUrlOverride,
            retries: 3
        });

        const upsertedRows = z.array(z.record(z.string(), z.unknown())).parse(response.data);
        if (upsertedRows.length === 0) {
            throw new nango.ActionError({
                type: 'upsert_failed',
                message: 'Upsert returned no rows.'
            });
        }

        const firstRow = upsertedRows[0];
        if (!firstRow) {
            throw new nango.ActionError({
                type: 'upsert_failed',
                message: 'Upsert returned no rows.'
            });
        }

        return {
            row: firstRow
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
