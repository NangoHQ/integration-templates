import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    company_id: z.number().describe('Company ID. Example: 138551860')
});

const OutputSchema = z.object({
    success: z.boolean(),
    company_id: z.number()
});

const action = createAction({
    description: 'Delete a company.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.delete({
            // https://app.pipelinecrm.com/api/docs/introduction
            endpoint: `/api/v3/companies/${encodeURIComponent(input.company_id)}`,
            retries: 1
        });

        return {
            success: true,
            company_id: input.company_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
