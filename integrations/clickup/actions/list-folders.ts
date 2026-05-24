import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    space_id: z.string().describe('The ID of the space to list folders from. Example: "901511023604"'),
    archived: z.boolean().optional().describe('Include archived folders. Defaults to false.')
});

const FolderSchema = z.object({
    id: z.string(),
    name: z.string(),
    orderindex: z.number(),
    override_statuses: z.boolean().optional(),
    hidden: z.boolean().optional(),
    space: z
        .object({
            id: z.string(),
            name: z.string()
        })
        .optional(),
    task_count: z.string().optional(),
    lists: z.array(z.unknown()).optional(),
    archived: z.boolean().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const ClickUpResponseSchema = z.object({
    folders: z.array(z.unknown())
});

const OutputSchema = z.object({
    folders: z.array(FolderSchema)
});

const action = createAction({
    description: 'List folders from a ClickUp space',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-folders'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.clickup.com/reference/getfolders
        const response = await nango.get({
            endpoint: `/api/v2/space/${encodeURIComponent(input.space_id)}/folder`,
            params: {
                archived: input.archived !== undefined ? String(input.archived) : 'false'
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Failed to retrieve folders from ClickUp API'
            });
        }

        const parsedResponse = ClickUpResponseSchema.safeParse(response.data);
        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from ClickUp API'
            });
        }

        const rawData = parsedResponse.data;

        const validatedFolders: z.infer<typeof FolderSchema>[] = [];
        for (const folder of rawData.folders) {
            const parseResult = FolderSchema.safeParse(folder);
            if (parseResult.success) {
                validatedFolders.push(parseResult.data);
            }
        }

        return {
            folders: validatedFolders
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
