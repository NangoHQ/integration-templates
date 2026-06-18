import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    item_id: z.string().describe('The ID of the item to update. Example: "2933609588"'),
    column_id: z.string().describe('The ID of the column to update. Example: "task_status"'),
    board_id: z.string().describe('The ID of the board containing the item. Example: "5096980653"'),
    value: z.string().describe('The new column value as a JSON-formatted string. Example: "{\\"label\\":\\"Done\\"}"'),
    create_labels_if_missing: z.boolean().optional().describe('If true, creates new Status or Dropdown labels that do not already exist.')
});

const ProviderColumnValueSchema = z.object({
    id: z.string(),
    value: z.string().optional().nullable(),
    text: z.string().optional().nullable()
});

const ProviderItemSchema = z.object({
    id: z.string(),
    name: z.string().optional().nullable(),
    column_values: z.array(ProviderColumnValueSchema).optional().nullable()
});

const OutputSchema = z.object({
    id: z.string().describe('The ID of the updated item.'),
    name: z.string().optional().describe('The name of the updated item.'),
    column_values: z
        .array(
            z.object({
                id: z.string(),
                value: z.string().optional(),
                text: z.string().optional()
            })
        )
        .optional()
        .describe('The column values of the updated item.')
});

const MondayErrorSchema = z.object({
    message: z.string()
});

const MondayResponseSchema = z.object({
    data: z
        .object({
            change_column_value: z.unknown().optional().nullable()
        })
        .optional()
        .nullable(),
    errors: z.array(MondayErrorSchema).optional().nullable()
});

const action = createAction({
    description: 'Change a monday.com item column value.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['boards:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = `
            mutation ($item_id: ID!, $column_id: String!, $value: JSON!, $board_id: ID!, $create_labels_if_missing: Boolean) {
                change_column_value(
                    item_id: $item_id,
                    column_id: $column_id,
                    value: $value,
                    board_id: $board_id,
                    create_labels_if_missing: $create_labels_if_missing
                ) {
                    id
                    name
                    column_values {
                        id
                        value
                        text
                    }
                }
            }
        `;

        const variables: Record<string, unknown> = {
            item_id: input.item_id,
            column_id: input.column_id,
            value: input.value,
            board_id: input.board_id
        };

        if (input.create_labels_if_missing !== undefined) {
            variables['create_labels_if_missing'] = input.create_labels_if_missing;
        }

        // https://developer.monday.com/api-reference/docs/change-column-values
        const response = await nango.post({
            endpoint: '/v2',
            headers: {
                'api-version': '2026-04'
            },
            data: {
                query,
                variables
            },
            retries: 3
        });

        const providerResponse = MondayResponseSchema.safeParse(response.data);
        if (!providerResponse.success) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Unexpected response format from monday.com API.'
            });
        }

        const graphQLErrors = providerResponse.data.errors;
        if (graphQLErrors && graphQLErrors.length > 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: graphQLErrors.map((e) => e.message).join(', ')
            });
        }

        const changeColumnValueData = providerResponse.data.data?.change_column_value;
        if (!changeColumnValueData) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Item or column not found, or the column value could not be changed.'
            });
        }

        const providerItem = ProviderItemSchema.parse(changeColumnValueData);

        return {
            id: providerItem.id,
            ...(providerItem.name != null && { name: providerItem.name }),
            ...(providerItem.column_values != null && {
                column_values: providerItem.column_values.map((cv) => ({
                    id: cv.id,
                    ...(cv.value != null && { value: cv.value }),
                    ...(cv.text != null && { text: cv.text })
                }))
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
