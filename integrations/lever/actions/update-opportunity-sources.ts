import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

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

const InputSchema = z.object({
    opportunityId: z.string().describe('Opportunity ID. Example: "6408dc54-7015-4e5b-8d60-23afff2b1efc"'),
    sources: z.array(z.string()).describe('Array of source names to add or remove. Example: ["Facebook"]'),
    delete: z.boolean().optional().describe('When true, removes the given sources instead of adding them.'),
    perform_as: z.string().optional().describe('Lever user ID to perform this action as. Required for most mutating endpoints.')
});

const OutputSchema = z.object({
    success: z.boolean(),
    opportunityId: z.string().optional(),
    response: LeverOpportunitySchema
});

const ProviderResponseSchema = z.object({
    data: LeverOpportunitySchema
});

const action = createAction({
    description: 'Update the sources in an opportunity',
    version: '3.0.0',
    input: InputSchema,
    output: OutputSchema,
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (!input.opportunityId) {
            throw new nango.ActionError({
                message: 'opportunityId can not be null or undefined'
            });
        }

        let endpoint: string;

        const putData: Pick<z.infer<typeof InputSchema>, 'sources'> = {
            sources: input.sources
        };

        if (input.delete) {
            endpoint = `/v1/opportunities/${encodeURIComponent(input.opportunityId)}/removeSources`;
        } else {
            endpoint = `/v1/opportunities/${encodeURIComponent(input.opportunityId)}/addSources`;
        }

        const config: ProxyConfiguration = {
            // https://hire.lever.co/developer/documentation#update-opportunity-sources
            endpoint,
            data: putData,
            retries: 3
        };

        if (input.perform_as) {
            config.params = { perform_as: input.perform_as };
        }

        const resp = await nango.post(config);
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
