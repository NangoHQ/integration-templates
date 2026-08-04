import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    ruleId: z.string().describe('The unique ID of the scanning rule. Example: "abc-def-123"')
});

const OutputSchema = z.object({
    id: z.string()
});

const action = createAction({
    description: 'Delete a scanning rule.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://docs.datadoghq.com/api/latest/sensitive-data-scanner/
            endpoint: `v2/sensitive-data-scanner/config/rules/${encodeURIComponent(input.ruleId)}`,
            retries: 3
        });

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Sensitive Data Scanner rule not found',
                ruleId: input.ruleId
            });
        }

        // DELETE may return a JSON body or 204; either way we confirm with the input id.
        return { id: input.ruleId };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
