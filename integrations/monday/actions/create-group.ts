import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    board_id: z.string().describe('Board ID. Example: "5096980653"'),
    group_name: z.string().describe('Group name. Maximum 255 characters.'),
    group_color: z.string().optional().describe('Group color HEX code. Example: "#ff642e"'),
    relative_to: z.string().optional().describe('Group ID to position relative to.'),
    position_relative_method: z.enum(['before_at', 'after_at']).optional().describe('Position relative method.')
});

const ProviderGroupSchema = z.object({
    id: z.string(),
    title: z.string().nullable().optional(),
    color: z.string().nullable().optional(),
    position: z.string().nullable().optional()
});

const MondayResponseSchema = z.object({
    data: z
        .object({
            create_group: ProviderGroupSchema.nullable().optional()
        })
        .optional(),
    errors: z.array(z.unknown()).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    color: z.string().optional(),
    position: z.string().optional()
});

const action = createAction({
    description: 'Create a group in monday.com.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-group',
        group: 'Groups'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['boards:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (!/^\d+$/.test(input.board_id)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'board_id must be a numeric string'
            });
        }

        const mutationArgs = [`board_id: ${input.board_id}`, `group_name: ${JSON.stringify(input.group_name)}`];

        if (input.group_color !== undefined) {
            mutationArgs.push(`group_color: ${JSON.stringify(input.group_color)}`);
        }

        if (input.relative_to !== undefined) {
            mutationArgs.push(`relative_to: ${JSON.stringify(input.relative_to)}`);
        }

        if (input.position_relative_method !== undefined) {
            mutationArgs.push(`position_relative_method: ${input.position_relative_method}`);
        }

        const query = `mutation { create_group(${mutationArgs.join(', ')}) { id title color position } }`;

        // https://developer.monday.com/api-reference/reference/groups
        const response = await nango.post({
            endpoint: '/v2',
            headers: {
                'api-version': '2026-04'
            },
            data: {
                query
            },
            retries: 3
        });

        const responseData = MondayResponseSchema.parse(response.data);

        if (responseData.errors && responseData.errors.length > 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Monday.com API returned errors',
                errors: responseData.errors
            });
        }

        if (!responseData.data || !responseData.data.create_group) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Invalid response from monday.com API: missing group data'
            });
        }

        const providerGroup = responseData.data.create_group;

        return {
            id: providerGroup.id,
            ...(providerGroup.title != null && { title: providerGroup.title }),
            ...(providerGroup.color != null && { color: providerGroup.color }),
            ...(providerGroup.position != null && { position: providerGroup.position })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
