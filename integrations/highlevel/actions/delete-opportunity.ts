import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    opportunityId: z.string().describe('Opportunity ID. Example: "yWQobCRIhRguQtD2llvk"')
});

const ProviderDeleteResponseSchema = z.object({
    success: z.boolean().optional(),
    succeeded: z.boolean().optional(),
    succeded: z.boolean().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    success: z.boolean()
});

const action = createAction({
    description: 'Delete an opportunity in HighLevel.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['opportunities.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://highlevel.stoplight.io/docs/integrations/
            endpoint: `/opportunities/${encodeURIComponent(input.opportunityId)}`,
            headers: {
                Version: '2021-07-28'
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Opportunity not found or delete failed',
                opportunityId: input.opportunityId
            });
        }

        const providerResponse = ProviderDeleteResponseSchema.parse(response.data);

        return {
            id: input.opportunityId,
            success: providerResponse.success ?? providerResponse.succeeded ?? providerResponse.succeded ?? true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
