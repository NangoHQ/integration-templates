import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    perform_as: z.string().optional(),
    links: z.array(z.string()),
    opportunityId: z.string(),
    delete: z.boolean()
});

const StageChangesObjectSchema = z.object({
    toStageId: z.string(),
    toStageIndex: z.number(),
    updatedAt: z.number(),
    userId: z.string()
});

const ProviderOpportunitySchema = z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    headline: z.string().optional(),
    contact: z.string().optional(),
    emails: z.array(z.string()).optional(),
    phones: z.array(z.object({ type: z.string(), value: z.string() })).optional(),
    confidentiality: z.string().optional(),
    location: z.string().optional(),
    links: z.array(z.string()).optional(),
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
    snoozedUntil: z.union([z.number(), z.null()]).optional(),
    archivedAt: z.number().optional(),
    archiveReason: z.string().optional(),
    stage: z.string().optional(),
    stageChanges: z.array(z.union([StageChangesObjectSchema, z.string()])).optional(),
    owner: z.string().optional(),
    tags: z.array(z.string()).optional(),
    sources: z.array(z.string()).optional(),
    origin: z.string().optional(),
    sourcedBy: z.string().optional(),
    applications: z.array(z.string()).optional(),
    resume: z.string().optional(),
    followers: z.array(z.string()).optional(),
    urls: z
        .object({
            list: z.string().optional(),
            show: z.string().optional()
        })
        .optional(),
    dataProtection: z.union([z.object({}), z.null()]).optional(),
    isAnonymized: z.boolean().optional(),
    opportunityLocation: z.string().optional()
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
