import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    opportunityId: z
        .string()
        .min(1, 'opportunityId cannot be empty')
        .describe('The ID of the opportunity to update. Example: "6408dc54-7015-4e5b-8d60-23afff2b1efc"'),
    tags: z.array(z.string()).describe('Array of tag names to add or remove from the opportunity. Example: ["Engineering", "Referral"]'),
    delete: z.boolean().optional().describe('When true, removes the given tags instead of adding them.'),
    perform_as: z.string().describe('The ID of the user to attribute this change to. Example: "be129d9b-50da-4485-9377-0d83e981f30b"')
});

const ProviderOpportunitySchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    tags: z.array(z.string()).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    tags: z.array(z.string()).optional()
});

const action = createAction({
    description: 'Update the tags in an opportunity',
    version: '3.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['opportunities:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const endpoint = input.delete
            ? `/v1/opportunities/${encodeURIComponent(input.opportunityId)}/removeTags`
            : `/v1/opportunities/${encodeURIComponent(input.opportunityId)}/addTags`;

        const response = await nango.post({
            // https://hire.lever.co/developer/documentation#update-opportunity-tags
            endpoint,
            params: {
                perform_as: input.perform_as
            },
            data: {
                tags: input.tags
            },
            retries: 3
        });

        let rawData = response.data;
        if (typeof response.data === 'object' && response.data !== null && 'data' in response.data) {
            const wrapped = response.data;
            if (typeof wrapped === 'object' && wrapped !== null && 'data' in wrapped) {
                const candidate = wrapped.data;
                rawData = candidate;
            }
        }

        const providerOpportunity = ProviderOpportunitySchema.parse(rawData);

        return {
            id: providerOpportunity.id,
            ...(providerOpportunity.name !== undefined && { name: providerOpportunity.name }),
            ...(providerOpportunity.tags !== undefined && { tags: providerOpportunity.tags })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
