import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    opportunityId: z.string().describe('The ID of the opportunity. Example: "6408dc54-7015-4e5b-8d60-23afff2b1efc"'),
    feedbackId: z.string().describe('The ID of the feedback form. Example: "3b743e1d-d075-4ec6-a8d8-83ebf43e3263"')
});

const FeedbackFieldSchema = z
    .object({
        id: z.string(),
        type: z.string(),
        text: z.string(),
        description: z.string().nullable().optional(),
        required: z.boolean(),
        prompt: z.string().nullable().optional(),
        options: z.array(z.object({ text: z.string() }).passthrough()).optional(),
        value: z.unknown().optional()
    })
    .passthrough();

const OutputSchema = z
    .object({
        id: z.string(),
        type: z.string().optional(),
        text: z.string().optional(),
        instructions: z.string().nullable().optional(),
        fields: z.array(FeedbackFieldSchema).optional(),
        baseTemplateId: z.string().nullable().optional(),
        interview: z.string().nullable().optional(),
        panel: z.string().nullable().optional(),
        user: z.string().nullable().optional(),
        createdAt: z.number().nullable().optional(),
        updatedAt: z.number().nullable().optional(),
        completedAt: z.number().nullable().optional(),
        deletedAt: z.number().nullable().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    data: OutputSchema
});

const action = createAction({
    description: 'Retrieve a single feedback form on an opportunity.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['feedback:read:admin'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://hire.lever.co/developer/documentation
            endpoint: `/v1/opportunities/${encodeURIComponent(input.opportunityId)}/feedback/${encodeURIComponent(input.feedbackId)}`,
            retries: 3
        };

        const response = await nango.get(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Feedback not found'
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);
        return providerResponse.data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
