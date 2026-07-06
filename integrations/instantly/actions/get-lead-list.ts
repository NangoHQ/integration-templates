import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Lead list ID. Example: "5c194eae-9382-4bf1-aff4-d9eaa90668e1"')
});

const ProviderLeadListSchema = z.object({
    id: z.string(),
    organization_id: z.string(),
    name: z.string(),
    timestamp_created: z.string(),
    has_enrichment_task: z.boolean().nullable().optional(),
    owned_by: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    organization_id: z.string(),
    name: z.string(),
    timestamp_created: z.string(),
    has_enrichment_task: z.boolean().optional(),
    owned_by: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a lead list',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    endpoint: {
        path: '/actions/get-lead-list',
        method: 'GET'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.instantly.ai/api-reference/leadlist/get-lead-list
            endpoint: `/v2/lead-lists/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Lead list not found',
                id: input.id
            });
        }

        const providerLeadList = ProviderLeadListSchema.parse(response.data);

        return {
            id: providerLeadList.id,
            organization_id: providerLeadList.organization_id,
            name: providerLeadList.name,
            timestamp_created: providerLeadList.timestamp_created,
            ...(providerLeadList.has_enrichment_task != null && { has_enrichment_task: providerLeadList.has_enrichment_task }),
            ...(providerLeadList.owned_by != null && { owned_by: providerLeadList.owned_by })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
