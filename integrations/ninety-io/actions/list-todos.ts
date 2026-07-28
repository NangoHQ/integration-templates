import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    teamId: z.string().optional().describe('Filter results to a specific team Id. Example: "6a616ba8908190d6d9458153"'),
    sort: z.string().optional().describe('The field to sort results by. Example: "dueDate"'),
    order: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
    pageSize: z.number().int().min(1).max(100).optional().describe('Number of results per page (max 100). Example: 25'),
    cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.'),
    isPersonal: z.boolean().optional().describe('Filter to personal To-Dos only (not associated with a team)'),
    completed: z.boolean().optional().describe('Filter by completed status'),
    archived: z.boolean().optional().describe('Filter by archived status'),
    searchText: z.string().optional().describe('Search text to match against To-Do title and description'),
    title: z.string().optional().describe('Filter by exact title match')
});

const ProviderTodoSchema = z.object({
    _id: z.string(),
    title: z.string(),
    description: z.string().optional().nullable(),
    dueDate: z.string().optional().nullable(),
    isPersonal: z.boolean(),
    completed: z.boolean(),
    archived: z.boolean(),
    teamId: z.string().optional().nullable(),
    teamName: z.string().optional().nullable(),
    userId: z.string(),
    companyId: z.string(),
    createdDate: z.string(),
    createdByUserId: z.string().optional().nullable(),
    deleted: z.boolean().optional(),
    deletedDate: z.string().optional().nullable(),
    deletedByUserId: z.string().optional().nullable(),
    completedDate: z.string().optional().nullable(),
    completedByUserId: z.string().optional().nullable(),
    archivedDate: z.string().optional().nullable(),
    archivedByUserId: z.string().optional().nullable(),
    milestoneId: z.string().optional().nullable()
});

const OutputSchema = z.object({
    items: z.array(
        z.object({
            id: z.string(),
            title: z.string(),
            description: z.string().optional(),
            dueDate: z.string().optional(),
            isPersonal: z.boolean(),
            completed: z.boolean(),
            archived: z.boolean(),
            teamId: z.string().optional(),
            teamName: z.string().optional(),
            userId: z.string(),
            companyId: z.string(),
            createdDate: z.string(),
            createdByUserId: z.string().optional(),
            completedDate: z.string().optional(),
            completedByUserId: z.string().optional(),
            archivedDate: z.string().optional(),
            archivedByUserId: z.string().optional(),
            deleted: z.boolean().optional(),
            deletedDate: z.string().optional(),
            deletedByUserId: z.string().optional(),
            milestoneId: z.string().optional()
        })
    ),
    nextPage: z.string().optional()
});

const action = createAction({
    description: 'Query to-dos (personal or team-based) with filtering options.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let page = 1;
        if (input.cursor !== undefined) {
            page = Number(input.cursor);
            if (!Number.isInteger(page) || page < 1) {
                throw new nango.ActionError({
                    type: 'invalid_input',
                    message: 'cursor must be a valid page number'
                });
            }
        }

        const response = await nango.post({
            // https://api.public.ninety.io/v1/swagger#/To-Dos/PostV1TodosQuery
            endpoint: '/v1/todos/query',
            data: {
                ...(input.teamId !== undefined && { teamId: input.teamId }),
                ...(input.sort !== undefined && { sort: input.sort }),
                ...(input.order !== undefined && { order: input.order }),
                ...(input.pageSize !== undefined && { pageSize: input.pageSize }),
                page,
                ...(input.isPersonal !== undefined && { isPersonal: input.isPersonal }),
                ...(input.completed !== undefined && { completed: input.completed }),
                ...(input.archived !== undefined && { archived: input.archived }),
                ...(input.searchText !== undefined && { searchText: input.searchText }),
                ...(input.title !== undefined && { title: input.title })
            },
            retries: 3
        });

        const providerTodos = z.array(ProviderTodoSchema).parse(response.data);

        const items = providerTodos.map((todo) => ({
            id: todo._id,
            title: todo.title,
            ...(todo.description != null && { description: todo.description }),
            ...(todo.dueDate != null && { dueDate: todo.dueDate }),
            isPersonal: todo.isPersonal,
            completed: todo.completed,
            archived: todo.archived,
            ...(todo.teamId != null && { teamId: todo.teamId }),
            ...(todo.teamName != null && { teamName: todo.teamName }),
            userId: todo.userId,
            companyId: todo.companyId,
            createdDate: todo.createdDate,
            ...(todo.createdByUserId != null && { createdByUserId: todo.createdByUserId }),
            ...(todo.completedDate != null && { completedDate: todo.completedDate }),
            ...(todo.completedByUserId != null && { completedByUserId: todo.completedByUserId }),
            ...(todo.archivedDate != null && { archivedDate: todo.archivedDate }),
            ...(todo.archivedByUserId != null && { archivedByUserId: todo.archivedByUserId }),
            ...(todo.deleted !== undefined && { deleted: todo.deleted }),
            ...(todo.deletedDate != null && { deletedDate: todo.deletedDate }),
            ...(todo.deletedByUserId != null && { deletedByUserId: todo.deletedByUserId }),
            ...(todo.milestoneId != null && { milestoneId: todo.milestoneId })
        }));

        const nextPage = input.pageSize !== undefined && providerTodos.length === input.pageSize ? String(page + 1) : undefined;

        return {
            items,
            ...(nextPage !== undefined && { nextPage })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
