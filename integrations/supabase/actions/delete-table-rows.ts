import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    table: z.string().describe('Name of the table to delete rows from. Example: "nango_test"'),
    filters: z.record(z.string(), z.string()).describe('PostgREST filters as query parameters. Example: {"name": "eq.del-row-1"}'),
    returnRepresentation: z.boolean().optional().describe('If true, adds Prefer: return=representation to return deleted rows')
});

const DeletedRowSchema = z.record(z.string(), z.unknown());

const OutputSchema = z.object({
    deletedCount: z.number().optional(),
    deletedRows: z.array(DeletedRowSchema).optional()
});

const action = createAction({
    description: 'Delete rows from a Supabase table.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (Object.keys(input.filters).length === 0) {
            throw new nango.ActionError({
                type: 'validation_error',
                message: 'At least one filter is required to delete rows. Unfiltered DELETE affects every row.'
            });
        }

        const connection = await nango.getConnection();
        let projectUrl: string | undefined;
        if (
            connection.connection_config &&
            typeof connection.connection_config === 'object' &&
            'projectUrl' in connection.connection_config &&
            typeof connection.connection_config['projectUrl'] === 'string'
        ) {
            projectUrl = connection.connection_config['projectUrl'];
        }
        const baseUrlOverride = projectUrl ? (projectUrl.startsWith('http') ? projectUrl : `https://${projectUrl}`) : undefined;

        const headers: Record<string, string> = {};
        if (input.returnRepresentation) {
            headers['Prefer'] = 'return=representation';
        }

        // https://supabase.com/docs/reference/api/delete-rows
        const response = await nango.delete({
            endpoint: `/rest/v1/${encodeURIComponent(input.table)}`,
            params: input.filters,
            headers,
            retries: 3,
            baseUrlOverride
        });

        if (input.returnRepresentation && Array.isArray(response.data)) {
            const deletedRows = response.data.map((row: unknown) => DeletedRowSchema.parse(row));
            return {
                deletedCount: deletedRows.length,
                deletedRows
            };
        }

        return {};
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
