import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const ContentListSchema = z.object({
    text: z.string().nullable().optional(),
    content: z.string().nullable().optional()
});

const PostingSchema = z.object({
    id: z.string(),
    text: z.string().nullable().optional(),
    createdAt: z.number().optional(),
    updatedAt: z.number().optional(),
    user: z.string().nullable().optional(),
    owner: z.string().nullable().optional(),
    hiringManager: z.string().nullable().optional(),
    confidentiality: z.string().nullable().optional(),
    categories: z
        .object({
            team: z.string().nullable().optional(),
            department: z.string().nullable().optional(),
            location: z.string().nullable().optional(),
            allLocations: z.string().array().nullable().optional(),
            commitment: z.string().nullable().optional(),
            level: z.string().nullable().optional()
        })
        .nullable()
        .optional(),
    content: z
        .object({
            description: z.string().nullable().optional(),
            descriptionHtml: z.string().nullable().optional(),
            lists: ContentListSchema.array().nullable().optional(),
            closing: z.string().nullable().optional(),
            closingHtml: z.string().nullable().optional()
        })
        .nullable()
        .optional(),
    country: z.string().nullable().optional(),
    followers: z.string().array().nullable().optional(),
    tags: z.string().array().nullable().optional(),
    state: z.string().nullable().optional(),
    distributionChannels: z.string().array().nullable().optional(),
    reqCode: z.string().nullable().optional(),
    requisitionCodes: z.string().array().nullable().optional(),
    salaryDescription: z.string().nullable().optional(),
    salaryDescriptionHtml: z.string().nullable().optional(),
    salaryRange: z
        .object({
            max: z.number().nullable().optional(),
            min: z.number().nullable().optional(),
            currency: z.string().nullable().optional(),
            interval: z.string().nullable().optional()
        })
        .nullable()
        .optional(),
    urls: z
        .object({
            list: z.string().nullable().optional(),
            show: z.string().nullable().optional(),
            apply: z.string().nullable().optional()
        })
        .nullable()
        .optional(),
    workplaceType: z.string().nullable().optional()
});

const OutputSchema = z.object({
    success: z.boolean(),
    response: z.array(PostingSchema)
});

const action = createAction({
    description: 'Get all posts for your account. Note that this does\nnot paginate the response so it is possible that not all postings \nare returned.',
    version: '2.0.2',
    input: z.object({}),
    output: OutputSchema,
    exec: async (nango): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://hire.lever.co/developer/documentation#list-all-postings
            endpoint: '/v1/postings',
            retries: 3
        };

        const response = await nango.get(config);

        const ProviderListSchema = z.object({
            data: z.array(PostingSchema),
            next: z.string().optional(),
            hasNext: z.boolean().optional()
        });

        const parsed = ProviderListSchema.parse(response.data);

        return {
            success: true,
            response: parsed.data
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
