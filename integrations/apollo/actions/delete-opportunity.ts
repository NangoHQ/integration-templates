import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Apollo opportunity ID. Example: "6a0af21285c69e000cc28695"')
});

const ProviderOpportunitySchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    is_closed: z.boolean().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    is_closed: z.boolean().optional()
});

const action = createAction({
    description: 'Archive (soft-delete) an opportunity in Apollo by marking it as closed.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-opportunity',
        group: 'Opportunities'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.apollo.io/reference/patch_v1opportunitiesid
        const response = await nango.patch({
            endpoint: `/v1/opportunities/${encodeURIComponent(input.id)}`,
            data: {
                is_closed: true
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Opportunity not found or could not be archived',
                id: input.id
            });
        }

        // Apollo returns the opportunity data directly or wrapped in an 'opportunity' field
        const recordData = z.object({}).passthrough().parse(response.data);
        const rawOpportunity = recordData['opportunity'] !== undefined ? recordData['opportunity'] : recordData;
        const opportunity = ProviderOpportunitySchema.parse(rawOpportunity);

        return {
            id: opportunity.id,
            ...(opportunity.name !== undefined && { name: opportunity.name }),
            ...(opportunity.is_closed !== undefined && opportunity.is_closed !== null && { is_closed: opportunity.is_closed })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
