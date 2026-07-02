import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const PostingSchema = z.object({
    id: z.string(),
    text: z.string().optional(),
    createdAt: z.number().optional(),
    updatedAt: z.number().optional(),
    deletedAt: z.number().optional(),
    user: z.string().optional(),
    owner: z.string().optional(),
    hiringManager: z.string().optional(),
    confidentiality: z.string().optional(),
    categories: z
        .object({
            team: z.string().optional(),
            department: z.string().optional(),
            location: z.string().optional(),
            allLocations: z.array(z.string()).optional(),
            commitment: z.string().optional(),
            level: z.string().optional()
        })
        .optional(),
    content: z
        .object({
            description: z.string().optional(),
            descriptionHtml: z.string().optional(),
            lists: z.array(z.object({ text: z.string().optional(), content: z.string().optional() })).optional(),
            closing: z.string().optional(),
            closingHtml: z.string().optional()
        })
        .optional(),
    country: z.string().optional(),
    followers: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    state: z.string().optional(),
    distributionChannels: z.array(z.string()).optional(),
    reqCode: z.string().optional(),
    requisitionCodes: z.array(z.string()).optional(),
    salaryDescription: z.string().optional(),
    salaryDescriptionHtml: z.string().optional(),
    salaryRange: z
        .object({
            max: z.number().optional(),
            min: z.number().optional(),
            currency: z.string().optional(),
            interval: z.string().optional()
        })
        .optional(),
    urls: z
        .object({
            list: z.string().optional(),
            show: z.string().optional(),
            apply: z.string().optional()
        })
        .optional(),
    workplaceType: z.string().optional()
});

const ListResponseSchema = z.object({
    data: z.array(PostingSchema),
    hasNext: z.boolean().optional(),
    next: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(PostingSchema),
    next: z.string().optional()
});

const action = createAction({
    description: 'List postings deleted from the account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['postings:read:admin'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://hire.lever.co/developer/documentation#list-deleted-postings
        const response = await nango.get({
            endpoint: '/v1/postings/deleted',
            params: {
                ...(input.cursor !== undefined && { offset: input.cursor })
            },
            retries: 3
        });

        const parsed = ListResponseSchema.parse(response.data);

        return {
            items: parsed.data,
            ...(parsed.next !== undefined && { next: parsed.next })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
