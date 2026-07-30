import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workflowId: z.string().describe('Workflow ID. Example: "6a6b328004308879e7d439b6"'),
    cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page.')
});

const ApprovalRequestSchema = z
    .object({
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        status: z.string().optional(),
        actorId: z.string().optional(),
        actorType: z.string().optional(),
        role: z.string().optional(),
        roleName: z.string().optional(),
        duration: z.number().optional(),
        durationSeconds: z.number().optional(),
        aggregateDuration: z.number().optional(),
        netRequestDurationSeconds: z.number().optional(),
        approvalType: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    page: z.number().optional(),
    pageSize: z.number().optional(),
    count: z.number().optional(),
    list: z.array(ApprovalRequestSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List the individual approval request events for a workflow',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['public.workflows.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? parseInt(input.cursor, 10) : 0;
        if (isNaN(page)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a valid page number'
            });
        }

        const response = await nango.get({
            // https://developer.ironcladapp.com/
            endpoint: `/public/api/v1/workflows/${encodeURIComponent(input.workflowId)}/approval-requests`,
            params: {
                page: page
            },
            retries: 3
        });

        const parsed = z
            .object({
                page: z.number().optional(),
                pageSize: z.number().optional(),
                count: z.number().optional(),
                list: z.array(z.unknown())
            })
            .parse(response.data);

        const list = parsed.list.map((item: unknown) => {
            return ApprovalRequestSchema.parse(item);
        });

        const hasMore = parsed.count != null && parsed.pageSize != null && parsed.count > (page + 1) * parsed.pageSize;

        return {
            page: parsed.page,
            pageSize: parsed.pageSize,
            count: parsed.count,
            list,
            ...(hasMore && { nextCursor: String(page + 1) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
