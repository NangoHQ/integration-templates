import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    opportunityId: z.string().describe('Opportunity ID. Example: "6408dc54-7015-4e5b-8d60-23afff2b1efc"'),
    stage: z.string().describe('Stage ID to update to.'),
    perform_as: z.string().optional().describe('Lever user ID to perform this action as. Required for most mutating endpoints.')
});

const LeverOpportunitySchema = z.object({
    id: z.string(),
    name: z.string().nullish(),
    headline: z.string().nullish(),
    contact: z.string().nullish(),
    emails: z.string().array().nullish(),
    phones: z.string().array().nullish(),
    confidentiality: z.string().nullish(),
    location: z.string().nullish(),
    links: z.string().array().nullish(),
    archived: z
        .object({
            reason: z.string().nullish(),
            archivedAt: z.number().nullish()
        })
        .nullish(),
    createdAt: z.number().nullish(),
    updatedAt: z.number().nullish(),
    lastInteractionAt: z.number().nullish(),
    lastAdvancedAt: z.number().nullish(),
    snoozedUntil: z.number().nullish(),
    archivedAt: z.number().nullish(),
    archiveReason: z.string().nullish(),
    stage: z.string().nullish(),
    stageChanges: z.unknown().array().nullish(),
    owner: z.string().nullish(),
    tags: z.string().array().nullish(),
    sources: z.string().array().nullish(),
    origin: z.string().nullish(),
    sourcedBy: z.string().nullish(),
    applications: z.string().array().nullish(),
    resume: z.string().nullish(),
    followers: z.string().array().nullish(),
    urls: z
        .object({
            list: z.string().nullish(),
            show: z.string().nullish()
        })
        .nullish(),
    dataProtection: z.unknown().nullish(),
    isAnonymized: z.boolean().nullish(),
    opportunityLocation: z.string().nullish()
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
