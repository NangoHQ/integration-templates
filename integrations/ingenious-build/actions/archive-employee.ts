import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    employeeId: z.string().describe('Employee ID. Example: "6a71de09f55241acad0cd435"')
});

const OutputSchema = z.object({
    id: z.string(),
    is_archived: z.boolean()
});

const action = createAction({
    description: 'Archive an employee (soft-retire, reversible).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://api.ingenious.build/reference/f79ce0bb4a28fd878f4a7a761a5b6b2f.md
        await nango.patch({
            endpoint: `/api/v2/pub/employees/${encodeURIComponent(input.employeeId)}/archive`,
            retries: 3
        });

        return {
            id: input.employeeId,
            is_archived: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
