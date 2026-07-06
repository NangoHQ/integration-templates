import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    opportunityId: z.string().describe('The opportunity ID. Example: "6408dc54-7015-4e5b-8d60-23afff2b1efc"'),
    expand: z.array(z.string()).optional().describe('Optional fields to expand, e.g. ["applications", "stage", "sourcedBy"]')
});

const ProviderOpportunitySchema = z
    .object({
        id: z.string(),
        name: z.string().nullish(),
        contact: z.union([z.string(), z.record(z.string(), z.unknown())]).nullish(),
        headline: z.string().nullish(),
        stage: z.union([z.string(), z.record(z.string(), z.unknown())]).nullish(),
        confidentiality: z.string().nullish(),
        location: z.string().nullish(),
        phones: z.array(z.record(z.string(), z.unknown())).nullish(),
        emails: z.array(z.string()).nullish(),
        links: z.array(z.string()).nullish(),
        archived: z.record(z.string(), z.unknown()).nullish(),
        tags: z.array(z.string()).nullish(),
        sources: z.array(z.string()).nullish(),
        stageChanges: z.array(z.record(z.string(), z.unknown())).nullish(),
        origin: z.string().nullish(),
        sourcedBy: z.union([z.string(), z.record(z.string(), z.unknown())]).nullish(),
        owner: z.union([z.string(), z.record(z.string(), z.unknown())]).nullish(),
        followers: z.array(z.union([z.string(), z.record(z.string(), z.unknown())])).nullish(),
        applications: z.array(z.union([z.string(), z.record(z.string(), z.unknown())])).nullish(),
        createdAt: z.number().nullish(),
        updatedAt: z.number().nullish(),
        lastInteractionAt: z.number().nullish(),
        lastAdvancedAt: z.number().nullish(),
        snoozedUntil: z.number().nullish(),
        urls: z.record(z.string(), z.unknown()).nullish(),
        isAnonymized: z.boolean().nullish(),
        dataProtection: z.record(z.string(), z.unknown()).nullish(),
        opportunityLocation: z.string().nullish()
    })
    .passthrough();

const OutputSchema = z
    .object({
        id: z.string(),
        name: z.string().optional(),
        contact: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
        headline: z.string().optional(),
        stage: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
        confidentiality: z.string().optional(),
        location: z.string().optional(),
        phones: z.array(z.record(z.string(), z.unknown())).optional(),
        emails: z.array(z.string()).optional(),
        links: z.array(z.string()).optional(),
        archived: z.record(z.string(), z.unknown()).optional(),
        tags: z.array(z.string()).optional(),
        sources: z.array(z.string()).optional(),
        stageChanges: z.array(z.record(z.string(), z.unknown())).optional(),
        origin: z.string().optional(),
        sourcedBy: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
        owner: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
        followers: z.array(z.union([z.string(), z.record(z.string(), z.unknown())])).optional(),
        applications: z.array(z.union([z.string(), z.record(z.string(), z.unknown())])).optional(),
        createdAt: z.number().optional(),
        updatedAt: z.number().optional(),
        lastInteractionAt: z.number().optional(),
        lastAdvancedAt: z.number().optional(),
        snoozedUntil: z.number().optional(),
        urls: z.record(z.string(), z.unknown()).optional(),
        isAnonymized: z.boolean().optional(),
        dataProtection: z.record(z.string(), z.unknown()).optional(),
        opportunityLocation: z.string().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve a single opportunity (candidate) by id.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://hire.lever.co/developer/documentation
            endpoint: `/v1/opportunities/${encodeURIComponent(input.opportunityId)}`,
            params: {
                ...(input.expand && input.expand.length > 0 && { expand: input.expand.join(',') })
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Opportunity not found',
                opportunityId: input.opportunityId
            });
        }

        const rawBody = response.data;
        const wrappedSchema = z.object({ data: z.unknown() });
        const wrappedResult = wrappedSchema.safeParse(rawBody);
        const opportunityData = wrappedResult.success ? wrappedResult.data.data : rawBody;

        const opportunity = ProviderOpportunitySchema.parse(opportunityData);

        return {
            id: opportunity.id,
            ...(opportunity.name != null && { name: opportunity.name }),
            ...(opportunity.contact != null && { contact: opportunity.contact }),
            ...(opportunity.headline != null && { headline: opportunity.headline }),
            ...(opportunity.stage != null && { stage: opportunity.stage }),
            ...(opportunity.confidentiality != null && { confidentiality: opportunity.confidentiality }),
            ...(opportunity.location != null && { location: opportunity.location }),
            ...(opportunity.phones != null && { phones: opportunity.phones }),
            ...(opportunity.emails != null && { emails: opportunity.emails }),
            ...(opportunity.links != null && { links: opportunity.links }),
            ...(opportunity.archived != null && { archived: opportunity.archived }),
            ...(opportunity.tags != null && { tags: opportunity.tags }),
            ...(opportunity.sources != null && { sources: opportunity.sources }),
            ...(opportunity.stageChanges != null && { stageChanges: opportunity.stageChanges }),
            ...(opportunity.origin != null && { origin: opportunity.origin }),
            ...(opportunity.sourcedBy != null && { sourcedBy: opportunity.sourcedBy }),
            ...(opportunity.owner != null && { owner: opportunity.owner }),
            ...(opportunity.followers != null && { followers: opportunity.followers }),
            ...(opportunity.applications != null && { applications: opportunity.applications }),
            ...(opportunity.createdAt != null && { createdAt: opportunity.createdAt }),
            ...(opportunity.updatedAt != null && { updatedAt: opportunity.updatedAt }),
            ...(opportunity.lastInteractionAt != null && { lastInteractionAt: opportunity.lastInteractionAt }),
            ...(opportunity.lastAdvancedAt != null && { lastAdvancedAt: opportunity.lastAdvancedAt }),
            ...(opportunity.snoozedUntil != null && { snoozedUntil: opportunity.snoozedUntil }),
            ...(opportunity.urls != null && { urls: opportunity.urls }),
            ...(opportunity.isAnonymized != null && { isAnonymized: opportunity.isAnonymized }),
            ...(opportunity.dataProtection != null && { dataProtection: opportunity.dataProtection }),
            ...(opportunity.opportunityLocation != null && { opportunityLocation: opportunity.opportunityLocation })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
