import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().optional().describe('Maximum number of results to return per page.')
});

const FeedbackTemplateFieldSchema = z
    .object({
        id: z.string(),
        text: z.string().optional(),
        type: z.string().optional()
    })
    .passthrough();

const FeedbackTemplateSchema = z
    .object({
        id: z.string(),
        name: z.string().optional(),
        text: z.string().optional(),
        fields: z.array(FeedbackTemplateFieldSchema).optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(FeedbackTemplateSchema),
    next: z.string().optional()
});

const action = createAction({
    description: 'List all feedback/interview scorecard templates.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://hire.lever.co/developer/documentation
            endpoint: '/v1/feedback_templates',
            params: {
                ...(input.cursor !== undefined && { offset: input.cursor }),
                ...(input.limit !== undefined && { limit: String(input.limit) })
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                data: z.array(z.unknown()),
                hasNext: z.boolean().optional(),
                next: z.string().optional()
            })
            .parse(response.data);

        const items = providerResponse.data.map((item: unknown) => {
            return FeedbackTemplateSchema.parse(item);
        });

        return {
            items,
            ...(providerResponse.next != null && { next: providerResponse.next })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
