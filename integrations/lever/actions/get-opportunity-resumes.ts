import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    opportunityId: z.string().describe('Opportunity ID. Example: "250d8f03-738a-4bba-a671-8a3d73477145"'),
    cursor: z.string().optional().describe('Pagination cursor (offset token) from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(100).optional().describe('Maximum number of resumes to return per page. Defaults to the API default.')
});

const ResumeFileSchema = z.object({
    name: z.string().optional(),
    ext: z.string().optional(),
    downloadUrl: z.string().optional(),
    uploadedAt: z.number().optional(),
    status: z.string().optional(),
    size: z.number().optional()
});

const ResumeSchema = z.object({
    id: z.string(),
    createdAt: z.number().optional(),
    file: ResumeFileSchema.nullish(),
    parsedData: z.record(z.string(), z.unknown()).optional()
});

const ListResponseSchema = z.object({
    data: z.array(ResumeSchema),
    next: z.string().optional(),
    hasNext: z.boolean().optional()
});

const OutputSchema = z.object({
    resumes: z.array(ResumeSchema),
    next: z.string().optional()
});

const action = createAction({
    description: 'List resumes attached to an opportunity.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['resumes:read:admin'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://hire.lever.co/developer/documentation#list-all-resumes
            endpoint: `/v1/opportunities/${encodeURIComponent(input.opportunityId)}/resumes`,
            params: {
                ...(input.cursor !== undefined && { offset: input.cursor }),
                ...(input.limit !== undefined && { limit: String(input.limit) })
            },
            retries: 3
        };

        const response = await nango.get(config);

        const parsed = ListResponseSchema.parse(response.data);

        return {
            resumes: parsed.data,
            ...(parsed.next !== undefined && { next: parsed.next })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
