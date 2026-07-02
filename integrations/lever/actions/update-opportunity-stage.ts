import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    opportunityId: z.string().describe('Opportunity ID. Example: "6408dc54-7015-4e5b-8d60-23afff2b1efc"'),
    stage: z.string().describe('Stage ID to update to.'),
    perform_as: z.string().optional().describe('Lever user ID to perform this action as. Required for most mutating endpoints.')
});

const LeverOpportunitySchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    headline: z.string().optional(),
    contact: z.string().optional(),
    emails: z.string().array().optional(),
    phones: z.string().array().optional(),
    confidentiality: z.string().optional(),
    location: z.string().optional(),
    links: z.string().array().optional(),
    archived: z
        .object({
            reason: z.string().optional(),
            archivedAt: z.number().optional()
        })
        .optional(),
    createdAt: z.number().optional(),
    updatedAt: z.number().optional(),
    lastInteractionAt: z.number().optional(),
    lastAdvancedAt: z.number().optional(),
    snoozedUntil: z.number().nullable().optional(),
    archivedAt: z.number().optional(),
    archiveReason: z.string().optional(),
    stage: z.string().optional(),
    stageChanges: z.unknown().array().optional(),
    owner: z.string().optional(),
    tags: z.string().array().optional(),
    sources: z.string().array().optional(),
    origin: z.string().optional(),
    sourcedBy: z.string().optional(),
    applications: z.string().array().optional(),
    resume: z.string().optional(),
    followers: z.string().array().optional(),
    urls: z
        .object({
            list: z.string().optional(),
            show: z.string().optional()
        })
        .optional(),
    dataProtection: z.unknown().nullable().optional(),
    isAnonymized: z.boolean().optional(),
    opportunityLocation: z.string().optional()
});

const OutputSchema = z.object({
    success: z.boolean(),
    opportunityId: z.string().optional(),
    response: LeverOpportunitySchema
});

const action = createAction({
    description: 'Update the stage in an opportunity',
    version: '3.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (!input.opportunityId) {
            throw new nango.ActionError({
                message: 'opportunityId can not be null or undefined'
            });
        }

        const endpoint = `/v1/opportunities/${encodeURIComponent(input.opportunityId)}/stage`;

        // https://hire.lever.co/developer/documentation#update-opportunity-stage
        const response = await nango.put({
            endpoint,
            data: {
                stage: input.stage
            },
            ...(input.perform_as && {
                params: {
                    perform_as: input.perform_as
                }
            }),
            retries: 3
        });

        const providerResponse = z
            .object({
                data: LeverOpportunitySchema
            })
            .parse(response.data);

        return {
            success: true,
            opportunityId: input.opportunityId,
            response: providerResponse.data
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
