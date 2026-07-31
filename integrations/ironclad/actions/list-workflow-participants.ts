import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workflowId: z.string().describe('The unique identifier or Ironclad ID of a workflow. Example: "6a6b328004308879e7d439b6"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response (page number). Omit for the first page.'),
    pageSize: z.number().min(1).max(100).optional().describe('A limit of the number of results to return. Maximum 100.'),
    email: z.string().optional().describe("Filter participants by the Ironclad user's email address.")
});

const ProviderParticipantSchema = z
    .object({
        userId: z.string(),
        email: z.string().optional().nullable()
    })
    .passthrough();

const ProviderListResponseSchema = z.object({
    page: z.number(),
    pageSize: z.number(),
    count: z.number(),
    list: z.array(ProviderParticipantSchema)
});

const ParticipantSchema = z.object({
    userId: z.string(),
    email: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(ParticipantSchema),
    nextCursor: z.string().optional(),
    page: z.number(),
    pageSize: z.number(),
    count: z.number()
});

const action = createAction({
    description: 'List internal users participating in a workflow.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['public.workflows.readParticipants'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? parseInt(input.cursor, 10) : 0;
        if (input.cursor && (isNaN(page) || page < 0)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a non-negative integer string'
            });
        }

        const response = await nango.get({
            // https://developer.ironcladapp.com/reference/list-all-workflow-participants
            endpoint: `/public/api/v1/workflows/${encodeURIComponent(input.workflowId)}/participants`,
            params: {
                ...(page > 0 && { page }),
                ...(input.pageSize !== undefined && { pageSize: input.pageSize }),
                ...(input.email !== undefined && { email: input.email })
            },
            retries: 3
        });

        const providerData = ProviderListResponseSchema.parse(response.data);

        const items = providerData.list.map((item) => ({
            userId: item.userId,
            ...(item.email != null && { email: item.email })
        }));

        const hasMore = providerData.count > (providerData.page + 1) * providerData.pageSize;
        const nextCursor = hasMore ? String(providerData.page + 1) : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { nextCursor }),
            page: providerData.page,
            pageSize: providerData.pageSize,
            count: providerData.count
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
