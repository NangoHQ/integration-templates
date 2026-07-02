import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Posting ID. Example: "f2f01e16-27f8-4711-a728-7d49499795a0"')
});

const ContentListSchema = z.object({
    text: z.string(),
    content: z.string()
});

const PostingContentSchema = z.object({
    description: z.string().nullish(),
    descriptionHtml: z.string().nullish(),
    lists: z.array(ContentListSchema).nullish(),
    closing: z.string().nullish(),
    closingHtml: z.string().nullish()
});

const CategoriesSchema = z.object({
    team: z.string().nullish(),
    department: z.string().nullish(),
    location: z.string().nullish(),
    allLocations: z.array(z.string()).nullish(),
    commitment: z.string().nullish(),
    level: z.string().nullish()
});

const SalaryRangeSchema = z.object({
    max: z.number().nullish(),
    min: z.number().nullish(),
    currency: z.string().nullish(),
    interval: z.string().nullish()
});

const UrlsSchema = z.object({
    list: z.string().nullish(),
    show: z.string().nullish(),
    apply: z.string().nullish()
});

const LeverPostingSchema = z.object({
    id: z.string(),
    text: z.string().nullish(),
    createdAt: z.number().nullish(),
    updatedAt: z.number().nullish(),
    user: z.string().nullish(),
    owner: z.string().nullish(),
    hiringManager: z.string().nullish(),
    confidentiality: z.string().nullish(),
    categories: CategoriesSchema.nullish(),
    content: PostingContentSchema.nullish(),
    country: z.string().nullish(),
    followers: z.array(z.string()).nullish(),
    tags: z.array(z.string()).nullish(),
    state: z.string().nullish(),
    distributionChannels: z.array(z.string()).nullish(),
    reqCode: z.string().nullish(),
    requisitionCodes: z.array(z.string()).nullish(),
    salaryDescription: z.string().nullish(),
    salaryDescriptionHtml: z.string().nullish(),
    salaryRange: SalaryRangeSchema.nullish(),
    urls: UrlsSchema.nullish(),
    workplaceType: z.string().nullish()
});

const OutputSchema = z.object({
    success: z.boolean(),
    response: LeverPostingSchema
});

const action = createAction({
    description: 'Get single post for your account in Lever',
    version: '3.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['postings:read:admin'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://hire.lever.co/developer/documentation#retrieve-a-single-posting
        const response = await nango.get({
            endpoint: `/v1/postings/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object' || Array.isArray(response.data)) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Posting not found',
                id: input.id
            });
        }

        const envelope = z.object({ data: LeverPostingSchema }).parse(response.data);
        const posting = envelope.data;

        return {
            success: true,
            response: posting
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
