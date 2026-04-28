import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    task_gid: z.string().describe('The task to operate on. Example: "1200000000000001"'),
    cursor: z.string().optional().describe('Pagination cursor (Asana offset) from the previous response. Omit for the first page.'),
    limit: z.number().min(1).max(100).optional().describe('Results per page. Between 1 and 100.')
});

const UserCompactSchema = z.object({
    gid: z.string(),
    resource_type: z.string(),
    name: z.string().optional()
});

const StorySchema = z.object({
    gid: z.string(),
    resource_type: z.string(),
    created_at: z.string().optional(),
    resource_subtype: z.string().optional(),
    text: z.string().optional(),
    html_text: z.string().optional(),
    type: z.string().optional(),
    is_editable: z.boolean().optional(),
    is_edited: z.boolean().optional(),
    is_pinned: z.boolean().optional(),
    sticker_name: z.string().nullable().optional(),
    created_by: UserCompactSchema.optional(),
    likes: z.array(z.unknown()).optional(),
    hearted: z.boolean().optional(),
    hearts: z.array(z.unknown()).optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(z.unknown()),
    next_page: z
        .object({
            offset: z.string(),
            path: z.string().optional(),
            uri: z.string().optional()
        })
        .nullable()
        .optional()
});

const OutputSchema = z.object({
    stories: z.array(StorySchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List stories and comments on a task.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-stories-for-task',
        group: 'Stories'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['stories:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.asana.com/reference/getstoriesfortask
        const response = await nango.get({
            endpoint: `/api/1.0/tasks/${input.task_gid}/stories`,
            params: {
                ...(input.cursor !== undefined && { offset: input.cursor }),
                ...(input.limit !== undefined && { limit: String(input.limit) }),
                opt_fields:
                    'gid,resource_type,created_at,resource_subtype,text,html_text,type,is_editable,is_edited,is_pinned,sticker_name,created_by.gid,created_by.resource_type,created_by.name'
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const stories = providerResponse.data.map((item: unknown) => {
            const story = StorySchema.parse(item);
            return {
                gid: story.gid,
                resource_type: story.resource_type,
                ...(story.created_at !== undefined && { created_at: story.created_at }),
                ...(story.resource_subtype !== undefined && { resource_subtype: story.resource_subtype }),
                ...(story.text !== undefined && { text: story.text }),
                ...(story.html_text !== undefined && { html_text: story.html_text }),
                ...(story.type !== undefined && { type: story.type }),
                ...(story.is_editable !== undefined && { is_editable: story.is_editable }),
                ...(story.is_edited !== undefined && { is_edited: story.is_edited }),
                ...(story.is_pinned !== undefined && { is_pinned: story.is_pinned }),
                ...(story.sticker_name !== undefined && { sticker_name: story.sticker_name }),
                ...(story.created_by !== undefined && {
                    created_by: {
                        gid: story.created_by.gid,
                        resource_type: story.created_by.resource_type,
                        ...(story.created_by.name !== undefined && { name: story.created_by.name })
                    }
                }),
                ...(story.likes !== undefined && { likes: story.likes }),
                ...(story.hearted !== undefined && { hearted: story.hearted }),
                ...(story.hearts !== undefined && { hearts: story.hearts })
            };
        });

        return {
            stories,
            ...(providerResponse.next_page?.offset !== undefined && { next_cursor: providerResponse.next_page.offset })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
