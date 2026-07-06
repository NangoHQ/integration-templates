import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    perform_as: z.string().optional(),
    links: z.array(z.string()),
    opportunityId: z.string(),
    delete: z.boolean().optional().describe('When true, removes the given links instead of adding them.')
});

const StageChangesObjectSchema = z.object({
    toStageId: z.string(),
    toStageIndex: z.number(),
    updatedAt: z.number(),
    userId: z.string()
});

const ProviderOpportunitySchema = z.object({
    id: z.string().optional(),
    name: z.string().nullish(),
    headline: z.string().nullish(),
    contact: z.string().nullish(),
    emails: z.array(z.string()).nullish(),
    phones: z.array(z.object({ type: z.string(), value: z.string() })).nullish(),
    confidentiality: z.string().nullish(),
    location: z.string().nullish(),
    links: z.array(z.string()).nullish(),
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
    stageChanges: z.array(z.union([StageChangesObjectSchema, z.string()])).nullish(),
    owner: z.string().nullish(),
    tags: z.array(z.string()).nullish(),
    sources: z.array(z.string()).nullish(),
    origin: z.string().nullish(),
    sourcedBy: z.string().nullish(),
    applications: z.array(z.string()).nullish(),
    resume: z.string().nullish(),
    followers: z.array(z.string()).nullish(),
    urls: z
        .object({
            list: z.string().nullish(),
            show: z.string().nullish()
        })
        .nullish(),
    dataProtection: z.record(z.string(), z.unknown()).nullish(),
    isAnonymized: z.boolean().nullish(),
    opportunityLocation: z.string().nullish()
});

const ProviderResponseSchema = z.object({
    data: ProviderOpportunitySchema
});

const OutputSchema = z.object({
    success: z.boolean(),
    opportunityId: z.string().optional(),
    response: ProviderOpportunitySchema
});

const action = createAction({
    description: 'Update the links in an opportunity',
    version: '3.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.links.length <= 0) {
            throw new nango.ActionError({
                message: 'links can not be an empty array'
            });
        }

        if (!input.opportunityId) {
            throw new nango.ActionError({
                message: 'opportunityId can not be null or undefined'
            });
        }

        const putData = {
            links: input.links
        };

        const endpoint = input.delete
            ? `/v1/opportunities/${encodeURIComponent(input.opportunityId)}/removeLinks`
            : `/v1/opportunities/${encodeURIComponent(input.opportunityId)}/addLinks`;

        // https://hire.lever.co/developer/documentation
        const resp = await nango.post({
            endpoint,
            data: putData,
            ...(input.perform_as && { params: { perform_as: input.perform_as } }),
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(resp.data);

        return {
            success: true,
            opportunityId: input.opportunityId,
            response: parsed.data
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
