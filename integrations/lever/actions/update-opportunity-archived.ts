import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    opportunityId: z.string().describe('Opportunity ID. Example: "6408dc54-7015-4e5b-8d60-23afff2b1efc"'),
    reason: z.string().describe('Archive reason ID. Example: "c97322d4-a7f3-4008-948c-4f8e9c58d372"'),
    cleanInterviews: z.boolean().optional().describe('Whether to remove pending interviews when archiving.'),
    requisitionId: z.string().optional().describe('Requisition ID to hire the candidate against.'),
    perform_as: z.string().optional().describe('Lever user ID to perform this action on behalf of.')
});

const ProviderResponseSchema = z.object({
    data: z.unknown()
});

const OutputSchema = z.object({
    success: z.boolean(),
    opportunityId: z.string(),
    response: z.unknown()
});

const action = createAction({
    description: 'Update the archived state of an opportunity',
    version: '3.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (!input.opportunityId) {
            throw new nango.ActionError({
                message: 'opportunityId can not be null or undefined'
            });
        }

        const putData: {
            reason: string;
            cleanInterviews?: boolean;
            requisitionId?: string;
        } = {
            reason: input.reason,
            cleanInterviews: input.cleanInterviews ?? false
        };

        if (input.requisitionId) {
            putData.requisitionId = input.requisitionId;
        }

        const path = `/v1/opportunities/${encodeURIComponent(input.opportunityId)}/archived`;
        const config: ProxyConfiguration = {
            // https://hire.lever.co/developer/documentation
            endpoint: path,
            data: putData,
            retries: 3
        };

        if (input.perform_as) {
            config.params = { perform_as: input.perform_as };
        }

        const resp = await nango.put(config);
        const providerResponse = ProviderResponseSchema.parse(resp.data);

        return {
            success: true,
            opportunityId: input.opportunityId,
            response: providerResponse.data
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
