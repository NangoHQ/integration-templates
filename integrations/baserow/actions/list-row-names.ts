import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    tables: z
        .record(z.string().regex(/^[1-9]\d*$/, 'Table ID key must be a positive integer'), z.array(z.number().int().positive()).min(1))
        .describe('Map of table IDs to arrays of row IDs to look up. Example: {"1080602": [1, 2]}')
});

const OutputSchema = z.object({
    names: z
        .record(z.string(), z.record(z.string(), z.string()))
        .describe('Map of table IDs to maps of row IDs to primary field values. Example: {"1080602": {"1": "Design UI"}}')
});

const action = createAction({
    description: 'Look up display names (primary field values) for specific rows across one or more tables.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {};
        for (const [tableId, rowIds] of Object.entries(input.tables)) {
            params[`table__${tableId}`] = rowIds.join(',');
        }

        const response = await nango.get({
            // https://api.baserow.io/api/redoc/
            endpoint: '/database/rows/names/',
            params,
            retries: 3
        });

        const parsed = z.record(z.string(), z.record(z.string(), z.string())).safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response shape from Baserow row names endpoint.'
            });
        }

        return {
            names: parsed.data
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
