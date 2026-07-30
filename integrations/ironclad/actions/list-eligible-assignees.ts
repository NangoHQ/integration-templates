import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workflowId: z.string().describe('The unique identifier or Ironclad ID of a workflow. Example: "6a6b328004308879e7d439b6"'),
    roleName: z.string().describe('The display name of the role. Example: "Legal Approver"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    pageSize: z.number().min(1).max(100).optional().describe('Number of results to return per page. Defaults to 20.')
});

const ProviderUserSchema = z
    .object({
        id: z.string().optional(),
        userId: z.string().optional(),
        email: z.string().optional(),
        name: z.string().optional(),
        displayName: z.string().optional(),
        userName: z.string().optional()
    })
    .passthrough();

const ProviderResponseSchema = z
    .object({
        users: z.array(ProviderUserSchema).optional(),
        list: z.array(ProviderUserSchema).optional(),
        currentAssigneeId: z.string().optional().nullable(),
        defaultAssignee: z
            .object({
                userId: z.string().optional(),
                email: z.string().optional(),
                displayName: z.string().optional()
            })
            .optional()
            .nullable(),
        page: z.number().optional(),
        pageSize: z.number().optional(),
        total: z.number().optional(),
        count: z.number().optional()
    })
    .passthrough();

const OutputUserSchema = z.object({
    id: z.string().optional(),
    email: z.string().optional(),
    name: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(OutputUserSchema),
    currentAssigneeId: z.string().optional(),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List users eligible to be assigned to a given workflow role.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['public.workflows.readRoleAssignees'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.ironcladapp.com/reference/list-workflow-role-eligible-assignees
        const pageParam = input.cursor !== undefined ? parseInt(input.cursor, 10) : undefined;
        const response = await nango.get({
            endpoint: `/public/api/v1/workflows/${encodeURIComponent(input.workflowId)}/roles/${encodeURIComponent(input.roleName)}/eligible-assignees`,
            params: {
                ...(pageParam !== undefined && { page: pageParam }),
                ...(input.pageSize !== undefined && { pageSize: input.pageSize })
            },
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        const users = providerData.users ?? providerData.list ?? [];
        const items = users.map((user) => {
            const id = user.id ?? user.userId;
            const name = user.name ?? user.displayName ?? user.userName;
            return {
                ...(id !== undefined && { id }),
                ...(user.email !== undefined && { email: user.email }),
                ...(name !== undefined && { name })
            };
        });

        const totalCount = providerData.total ?? providerData.count ?? 0;
        const page = providerData.page ?? 0;
        const pageSize = providerData.pageSize ?? 20;
        const hasNextPage = items.length === pageSize && (page + 1) * pageSize < totalCount;
        const currentAssigneeId = providerData.currentAssigneeId ?? providerData.defaultAssignee?.userId;

        return {
            items,
            ...(currentAssigneeId != null && { currentAssigneeId: currentAssigneeId }),
            ...(hasNextPage && { nextCursor: String(page + 1) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
