import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the lead list to update. Example: "019f1a45-a708-7d03-8559-2ba70b2e77cc"'),
    name: z.string().optional().describe('Name of the lead list.'),
    has_enrichment_task: z.boolean().nullable().optional().describe('Whether this list runs the enrichment process on every added lead or not.'),
    owned_by: z.string().nullable().optional().describe('User ID of the owner of this lead list.')
});

const ProviderLeadListSchema = z.object({
    id: z.string(),
    organization_id: z.string(),
    name: z.string(),
    has_enrichment_task: z.boolean().nullable().optional(),
    owned_by: z.string().nullable().optional(),
    timestamp_created: z.string()
});

const OutputSchema = z.object({
    id: z.string(),
    organization_id: z.string(),
    name: z.string(),
    has_enrichment_task: z.boolean().optional(),
    owned_by: z.string().optional(),
    timestamp_created: z.string()
});

const action = createAction({
    description: 'Patch a lead list.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['lead_lists:update'],
    endpoint: {
        path: '/actions/patch-lead-list',
        method: 'POST'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developer.instantly.ai/api-reference/leadlist/patch-lead-list.md
            endpoint: `/v2/lead-lists/${encodeURIComponent(input.id)}`,
            data: {
                ...(input.name !== undefined && { name: input.name }),
                ...(input.has_enrichment_task !== undefined && { has_enrichment_task: input.has_enrichment_task }),
                ...(input.owned_by !== undefined && { owned_by: input.owned_by })
            },
            retries: 3
        };

        const response = await nango.patch(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Lead list not found or update failed',
                id: input.id
            });
        }

        const providerLeadList = ProviderLeadListSchema.parse(response.data);

        return {
            id: providerLeadList.id,
            organization_id: providerLeadList.organization_id,
            name: providerLeadList.name,
            ...(providerLeadList.has_enrichment_task != null && { has_enrichment_task: providerLeadList.has_enrichment_task }),
            ...(providerLeadList.owned_by != null && { owned_by: providerLeadList.owned_by }),
            timestamp_created: providerLeadList.timestamp_created
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
