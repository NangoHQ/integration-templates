import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    parent: z.string().describe('Globally unique identifier for the object to list attachments from. Must be a GID for a project, project_brief, or task.'),
    cursor: z.string().optional().describe('Pagination cursor (offset token) from the previous response. Omit for the first page.')
});

const ProviderAttachmentSchema = z.object({
    gid: z.string(),
    resource_type: z.string().optional(),
    name: z.string().optional(),
    resource_subtype: z.string().optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderAttachmentSchema),
    next_page: z
        .object({
            offset: z.string(),
            path: z.string(),
            uri: z.string()
        })
        .optional()
        .nullable()
});

const AttachmentSchema = z.object({
    gid: z.string(),
    resource_type: z.string().optional(),
    name: z.string().optional(),
    resource_subtype: z.string().optional()
});

const OutputSchema = z.object({
    attachments: z.array(AttachmentSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List attachments on a task or other supported object.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-attachments-for-object',
        group: 'Attachments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['attachments:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.asana.com/reference/getattachmentsforobject
            endpoint: '/api/1.0/attachments',
            params: {
                parent: input.parent,
                limit: '100',
                ...(input.cursor !== undefined && { offset: input.cursor })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            attachments: providerResponse.data.map((item) => ({
                gid: item.gid,
                ...(item.resource_type !== undefined && { resource_type: item.resource_type }),
                ...(item.name !== undefined && { name: item.name }),
                ...(item.resource_subtype !== undefined && { resource_subtype: item.resource_subtype })
            })),
            ...(providerResponse.next_page?.offset !== undefined && { next_cursor: providerResponse.next_page.offset })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
