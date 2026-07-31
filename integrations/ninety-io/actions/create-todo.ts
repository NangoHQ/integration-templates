import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    title: z.string().describe('The title of the to-do. Example: "Follow up with client"'),
    teamId: z.string().optional().describe('Team ID to assign the to-do to. If omitted, creates a personal to-do. Example: "6a616ba8908190d6d9458153"')
});

const ProviderTodoSchema = z.object({
    _id: z.string(),
    title: z.string(),
    isPersonal: z.boolean().optional(),
    teamId: z.string().nullable().optional(),
    userId: z.string().optional(),
    createdByUserId: z.string().optional(),
    createdDate: z.string().optional(),
    deleted: z.boolean().optional(),
    deletedDate: z.string().nullable().optional(),
    deletedByUserId: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    title: z.string(),
    isPersonal: z.boolean().optional(),
    teamId: z.string().nullable().optional(),
    userId: z.string().optional(),
    createdByUserId: z.string().optional(),
    createdDate: z.string().optional(),
    deleted: z.boolean().optional(),
    deletedDate: z.string().nullable().optional(),
    deletedByUserId: z.string().nullable().optional()
});

const action = createAction({
    description: 'Create a to-do (personal or team-based).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://help.ninety.io/en/articles/15505694-api-reference-and-access
            endpoint: '/v1/todos',
            data: {
                title: input.title,
                ...(input.teamId !== undefined && { teamId: input.teamId })
            },
            retries: 3
        });

        const providerTodo = ProviderTodoSchema.parse(response.data);

        return {
            id: providerTodo._id,
            title: providerTodo.title,
            ...(providerTodo.isPersonal !== undefined && { isPersonal: providerTodo.isPersonal }),
            ...(providerTodo.teamId !== undefined && { teamId: providerTodo.teamId }),
            ...(providerTodo.userId !== undefined && { userId: providerTodo.userId }),
            ...(providerTodo.createdByUserId !== undefined && { createdByUserId: providerTodo.createdByUserId }),
            ...(providerTodo.createdDate !== undefined && { createdDate: providerTodo.createdDate }),
            ...(providerTodo.deleted !== undefined && { deleted: providerTodo.deleted }),
            ...(providerTodo.deletedDate !== undefined && { deletedDate: providerTodo.deletedDate }),
            ...(providerTodo.deletedByUserId !== undefined && { deletedByUserId: providerTodo.deletedByUserId })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
