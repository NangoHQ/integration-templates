import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        postingId: z.string().describe('The ID of the posting to update. Example: "75ff237f-c221-4c26-8b23-faf395f5ea1c"'),
        performAs: z.string().describe('A Lever user ID to attribute the update to. Example: "be129d9b-50da-4485-9377-0d83e981f30b"'),
        text: z.string().optional().describe('Job title'),
        state: z.enum(['draft', 'internal', 'public', 'closed']).optional().describe('Posting state'),
        country: z.string().optional().describe('Country'),
        location: z.string().optional().describe('Location'),
        tags: z.array(z.string()).optional().describe('Tags'),
        requisitionCodes: z.array(z.string()).optional().describe('Requisition codes'),
        content: z
            .object({
                descriptionHtml: z.string().optional().describe('Job description HTML'),
                lists: z
                    .array(
                        z
                            .object({
                                text: z.string().optional(),
                                content: z.string().optional()
                            })
                            .passthrough()
                    )
                    .optional()
                    .describe('Content lists'),
                closingHtml: z.string().optional().describe('Closing HTML')
            })
            .optional()
            .describe('Posting content'),
        distributionChannels: z.array(z.string()).optional().describe('Distribution channels'),
        owner: z.string().optional().describe('Owner user ID'),
        hiringManager: z.string().optional().describe('Hiring manager user ID'),
        followers: z.array(z.string()).optional().describe('Follower user IDs'),
        categories: z
            .object({
                team: z.string().optional(),
                department: z.string().optional(),
                location: z.string().optional(),
                allLocations: z.array(z.string()).optional(),
                commitment: z.string().optional(),
                level: z.string().optional()
            })
            .optional()
            .describe('Posting categories')
    })
    .passthrough();

const ProviderPostingSchema = z
    .object({
        id: z.string(),
        text: z.string().optional(),
        state: z.string().optional(),
        country: z.string().optional(),
        location: z.string().optional(),
        tags: z.array(z.string()).optional(),
        requisitionCodes: z.array(z.string()).optional(),
        content: z
            .object({
                description: z.string().optional(),
                descriptionHtml: z.string().optional(),
                closing: z.string().optional(),
                closingHtml: z.string().optional(),
                lists: z.array(z.unknown()).optional()
            })
            .passthrough()
            .optional(),
        distributionChannels: z.array(z.string()).nullable().optional(),
        user: z.string().optional(),
        owner: z.string().optional(),
        hiringManager: z.string().nullable().optional(),
        followers: z.array(z.string()).optional(),
        categories: z
            .object({
                team: z.string().optional(),
                department: z.string().optional(),
                location: z.string().optional(),
                allLocations: z.array(z.string()).optional(),
                commitment: z.string().optional(),
                level: z.string().nullable().optional()
            })
            .passthrough()
            .optional(),
        reqCode: z.string().nullable().optional(),
        confidentiality: z.string().optional(),
        createdAt: z.number().optional(),
        updatedAt: z.number().optional(),
        workplaceType: z.string().optional(),
        transcribeInterviews: z.boolean().optional(),
        screening: z.object({ enabled: z.boolean().optional() }).optional(),
        urls: z
            .object({
                list: z.string().optional(),
                show: z.string().optional(),
                apply: z.string().optional()
            })
            .nullable()
            .optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    text: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    location: z.string().optional(),
    tags: z.array(z.string()).optional(),
    requisitionCodes: z.array(z.string()).optional(),
    content: z
        .object({
            description: z.string().optional(),
            descriptionHtml: z.string().optional(),
            closing: z.string().optional(),
            closingHtml: z.string().optional(),
            lists: z.array(z.unknown()).optional()
        })
        .passthrough()
        .optional(),
    distributionChannels: z.array(z.string()).nullable().optional(),
    user: z.string().optional(),
    owner: z.string().optional(),
    hiringManager: z.string().nullable().optional(),
    followers: z.array(z.string()).optional(),
    categories: z
        .object({
            team: z.string().optional(),
            department: z.string().optional(),
            location: z.string().optional(),
            allLocations: z.array(z.string()).optional(),
            commitment: z.string().optional(),
            level: z.string().nullable().optional()
        })
        .passthrough()
        .optional(),
    reqCode: z.string().nullable().optional(),
    confidentiality: z.string().optional(),
    createdAt: z.number().optional(),
    updatedAt: z.number().optional(),
    workplaceType: z.string().optional(),
    transcribeInterviews: z.boolean().optional(),
    screening: z.object({ enabled: z.boolean().optional() }).optional(),
    urls: z
        .object({
            list: z.string().optional(),
            show: z.string().optional(),
            apply: z.string().optional()
        })
        .optional()
});

const action = createAction({
    description: 'Update an existing job posting.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['postings:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const { postingId, performAs, ...bodyFields } = input;

        const response = await nango.post({
            // https://hire.lever.co/developer/documentation
            endpoint: `/v1/postings/${encodeURIComponent(postingId)}`,
            params: {
                perform_as: performAs
            },
            data: bodyFields,
            retries: 3
        });

        if (!response.data || !response.data.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Posting ${postingId} not found or update failed.`,
                postingId
            });
        }

        const providerPosting = ProviderPostingSchema.parse(response.data.data);

        return {
            id: providerPosting.id,
            ...(providerPosting.text != null && { text: providerPosting.text }),
            ...(providerPosting.state != null && { state: providerPosting.state }),
            ...(providerPosting.country != null && { country: providerPosting.country }),
            ...(providerPosting.location != null && { location: providerPosting.location }),
            ...(providerPosting.tags != null && { tags: providerPosting.tags }),
            ...(providerPosting.requisitionCodes != null && { requisitionCodes: providerPosting.requisitionCodes }),
            ...(providerPosting.content != null && { content: providerPosting.content }),
            ...(providerPosting.distributionChannels != null && { distributionChannels: providerPosting.distributionChannels }),
            ...(providerPosting.user != null && { user: providerPosting.user }),
            ...(providerPosting.owner != null && { owner: providerPosting.owner }),
            ...(providerPosting.hiringManager != null && { hiringManager: providerPosting.hiringManager }),
            ...(providerPosting.followers != null && { followers: providerPosting.followers }),
            ...(providerPosting.categories != null && { categories: providerPosting.categories }),
            ...(providerPosting.reqCode != null && { reqCode: providerPosting.reqCode }),
            ...(providerPosting.confidentiality != null && { confidentiality: providerPosting.confidentiality }),
            ...(providerPosting.createdAt != null && { createdAt: providerPosting.createdAt }),
            ...(providerPosting.updatedAt != null && { updatedAt: providerPosting.updatedAt }),
            ...(providerPosting.workplaceType != null && { workplaceType: providerPosting.workplaceType }),
            ...(providerPosting.transcribeInterviews != null && { transcribeInterviews: providerPosting.transcribeInterviews }),
            ...(providerPosting.screening != null && { screening: providerPosting.screening }),
            ...(providerPosting.urls != null && { urls: providerPosting.urls })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
