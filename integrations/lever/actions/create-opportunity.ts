import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const PhoneEntrySchema = z.object({
    value: z.string(),
    type: z.string()
});

const ArchivedEntrySchema = z.object({
    archivedAt: z.number(),
    reason: z.string()
});

const LeverCreateOpportunityInputSchema = z.object({
    perform_as: z.string().describe('Lever user ID to attribute this change to. Example: "c4bc6266-375b-4d45-9b3b-ad527ba5f3ef"'),
    parse: z.boolean().optional(),
    perform_as_posting_owner: z.boolean().optional(),
    name: z.string().optional(),
    headline: z.string().optional(),
    stage: z.string().optional(),
    location: z.string().optional(),
    phones: z.array(PhoneEntrySchema).optional(),
    emails: z.array(z.string()).optional(),
    links: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    sources: z.array(z.string()).optional(),
    origin: z.string().optional(),
    owner: z.string().optional(),
    followers: z.array(z.string()).optional(),
    postings: z.array(z.string()).optional(),
    createdAt: z.number().optional(),
    archived: ArchivedEntrySchema.optional(),
    contact: z.string().optional()
});

const StageChangesObjectSchema = z.object({
    toStageId: z.string(),
    toStageIndex: z.number(),
    updatedAt: z.number(),
    userId: z.string()
});

const LeverOpportunitySchema = z.object({
    id: z.string(),
    name: z.string(),
    headline: z.string().nullish(),
    contact: z.string().nullish(),
    emails: z.array(z.string()).nullish(),
    phones: z.array(PhoneEntrySchema).nullish(),
    confidentiality: z.string().nullish(),
    location: z.string().nullish(),
    links: z.array(z.string()).nullish(),
    archived: z
        .object({
            reason: z.string(),
            archivedAt: z.number()
        })
        .nullish(),
    createdAt: z.number(),
    updatedAt: z.number(),
    lastInteractionAt: z.number().nullish(),
    lastAdvancedAt: z.number().nullish(),
    snoozedUntil: z.number().nullish(),
    archivedAt: z.number().nullish(),
    archiveReason: z.string().nullish(),
    stage: z.string().nullish(),
    stageChanges: z.array(z.union([z.string(), StageChangesObjectSchema])).nullish(),
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

const CreateOpportunityResponseSchema = z.object({
    data: LeverOpportunitySchema
});

const action = createAction({
    description: 'Create an opportunity and optionally candidates associated with the opportunity',
    version: '3.0.0',
    input: LeverCreateOpportunityInputSchema,
    output: LeverOpportunitySchema,
    scopes: ['opportunities:write:admin'],

    exec: async (nango, input): Promise<z.infer<typeof LeverOpportunitySchema>> => {
        if (!input.perform_as) {
            throw new nango.ActionError({
                message: 'perform_as is the only required field'
            });
        }

        const postData = {
            name: input.name,
            headline: input.headline,
            stage: input.stage,
            location: input.location,
            phones: input.phones,
            emails: input.emails,
            links: input.links,
            tags: input.tags,
            sources: input.sources,
            origin: input.origin,
            owner: input.owner,
            followers: input.followers,
            postings: input.postings,
            createdAt: input.createdAt,
            archived: input.archived,
            contact: input.contact
        };

        const params: Record<string, string> = {};
        if (input.perform_as) {
            params['perform_as'] = input.perform_as;
        }
        if (input.parse !== undefined) {
            params['parse'] = input.parse ? 'true' : 'false';
        }
        if (input.perform_as_posting_owner !== undefined) {
            params['perform_as_posting_owner'] = input.perform_as_posting_owner ? 'true' : 'false';
        }

        const config: ProxyConfiguration = {
            // https://hire.lever.co/developer/documentation#create-an-opportunity
            endpoint: '/v1/opportunities',
            data: postData,
            params,
            retries: 3
        };

        const resp = await nango.post(config);
        const parsed = CreateOpportunityResponseSchema.parse(resp.data);

        return {
            id: parsed.data.id,
            name: parsed.data.name,
            headline: parsed.data.headline,
            contact: parsed.data.contact,
            emails: parsed.data.emails,
            phones: parsed.data.phones,
            confidentiality: parsed.data.confidentiality,
            location: parsed.data.location,
            links: parsed.data.links,
            archived: parsed.data.archived,
            createdAt: parsed.data.createdAt,
            updatedAt: parsed.data.updatedAt,
            lastInteractionAt: parsed.data.lastInteractionAt,
            lastAdvancedAt: parsed.data.lastAdvancedAt,
            snoozedUntil: parsed.data.snoozedUntil,
            archivedAt: parsed.data.archivedAt,
            archiveReason: parsed.data.archiveReason,
            stage: parsed.data.stage,
            stageChanges: parsed.data.stageChanges,
            owner: parsed.data.owner,
            tags: parsed.data.tags,
            sources: parsed.data.sources,
            origin: parsed.data.origin,
            sourcedBy: parsed.data.sourcedBy,
            applications: parsed.data.applications,
            resume: parsed.data.resume,
            followers: parsed.data.followers,
            urls: parsed.data.urls,
            dataProtection: parsed.data.dataProtection,
            isAnonymized: parsed.data.isAnonymized,
            opportunityLocation: parsed.data.opportunityLocation
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
