import { z } from 'zod';
import { createAction } from 'nango';

const ColorEnum = z.enum([
    'dark-pink',
    'dark-green',
    'dark-blue',
    'dark-red',
    'dark-teal',
    'dark-brown',
    'dark-orange',
    'dark-purple',
    'dark-warm-gray',
    'light-pink',
    'light-green',
    'light-blue',
    'light-red',
    'light-teal',
    'light-brown',
    'light-orange',
    'light-purple',
    'light-warm-gray'
]);

const InputSchema = z.object({
    tag_gid: z.string().describe('Globally unique identifier for the tag. Example: "12345"'),
    name: z.string().optional().describe('New name for the tag.'),
    color: ColorEnum.nullable().optional().describe('Color of the tag. Set to null to clear.')
});

const WorkspaceSchema = z.object({
    gid: z.string(),
    resource_type: z.string().optional(),
    name: z.string().optional()
});

const ProviderTagSchema = z.object({
    gid: z.string(),
    resource_type: z.string().optional(),
    name: z.string().optional(),
    color: z.string().nullable().optional(),
    workspace: WorkspaceSchema.optional()
});

const OutputSchema = z.object({
    gid: z.string(),
    resource_type: z.string().optional(),
    name: z.string().optional(),
    color: z.string().nullable().optional(),
    workspace: WorkspaceSchema.optional()
});

const action = createAction({
    description: 'Update mutable fields on a tag.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-tag',
        group: 'Tags'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tags:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {};
        if (input.name !== undefined) {
            body['name'] = input.name;
        }
        if (input.color !== undefined) {
            body['color'] = input.color;
        }

        // https://developers.asana.com/reference/updatetag
        const response = await nango.put({
            endpoint: `api/1.0/tags/${input.tag_gid}`,
            data: {
                data: body
            },
            retries: 3
        });

        const raw = response.data;
        if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from Asana API'
            });
        }

        const dataValue = raw['data'];
        const tagData = ProviderTagSchema.parse(dataValue);

        return {
            gid: tagData.gid,
            ...(tagData.resource_type != null && { resource_type: tagData.resource_type }),
            ...(tagData.name != null && { name: tagData.name }),
            ...(tagData.color !== undefined && { color: tagData.color }),
            ...(tagData.workspace != null && { workspace: tagData.workspace })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
