import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    board_id: z.string().describe('Board ID. Example: "5096980653"'),
    group_id: z.string().describe('Group ID. Example: "topics"'),
    group_attribute: z.enum(['color', 'position', 'relative_position_after', 'relative_position_before', 'title']).describe('The group attribute to update.'),
    new_value: z.string().describe('The new attribute value.')
});

const ProviderGroupSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    color: z.string().optional(),
    position: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    color: z.string().optional(),
    position: z.string().optional()
});

const action = createAction({
    description: 'Update a group in monday.com.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-group',
        group: 'Groups'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['boards:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = `
            mutation {
                update_group(
                    board_id: ${input.board_id},
                    group_id: ${JSON.stringify(input.group_id)},
                    group_attribute: ${input.group_attribute},
                    new_value: ${JSON.stringify(input.new_value)}
                ) {
                    id
                    title
                    color
                    position
                }
            }
        `;

        const response = await nango.post({
            // https://developer.monday.com/api-reference/reference/groups#update-group
            endpoint: '/v2',
            headers: {
                'api-version': '2026-04'
            },
            data: { query },
            retries: 3
        });

        const ResponseSchema = z.object({
            errors: z.array(z.object({ message: z.string() })).optional(),
            data: z
                .object({
                    update_group: ProviderGroupSchema.optional().nullable()
                })
                .optional()
                .nullable()
        });

        const parsedResponse = ResponseSchema.safeParse(response.data);
        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'parse_error',
                message: 'Failed to parse provider response'
            });
        }

        const errors = parsedResponse.data.errors;
        if (errors && errors.length > 0) {
            const firstError = errors[0];
            if (firstError) {
                throw new nango.ActionError({
                    type: 'provider_error',
                    message: firstError.message
                });
            }
        }

        const groupData = parsedResponse.data.data?.update_group;
        if (!groupData) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Group not found or update failed'
            });
        }

        const providerGroup = groupData;

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
