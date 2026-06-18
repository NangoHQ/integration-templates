import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    board_id: z.string().describe('The unique identifier of the board that contains the column to delete. Example: "5096980653"'),
    column_id: z.string().describe('The unique identifier of the column to delete. Example: "task_status"')
});

const ProviderColumnSchema = z.object({
    id: z.string()
});

const ProviderErrorSchema = z.object({
    message: z.string()
});

const ProviderResponseSchema = z.object({
    data: z
        .object({
            delete_column: ProviderColumnSchema
        })
        .optional(),
    errors: z.array(ProviderErrorSchema).optional()
});

const OutputSchema = z.object({
    id: z.string().describe('The unique identifier of the deleted column.')
});

const action = createAction({
    description: 'Delete or archive a column in monday.com.',
    version: '1.0.1',
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

        // https://developer.monday.com/api-reference/reference/columns#delete-column
        const response = await nango.post({
            endpoint: '/v2',
            headers: {
                'Content-Type': 'application/json',
                'API-Version': '2026-04'
            },
            data: {
                query: `mutation { delete_column(board_id: ${input.board_id}, column_id: "${input.column_id}") { id } }`
            },
            retries: 1
        });

        const providerResponse = ProviderResponseSchema.safeParse(response.data);
        if (!providerResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from monday.com API'
            });
        }

        const data = providerResponse.data;

        if (data.errors && data.errors.length > 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: data.errors[0]?.message || 'monday.com API returned an error',
                errors: data.errors
            });
        }

        if (!data.data || !data.data.delete_column) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'delete_column data missing from API response'
            });
        }

        return {
            id: data.data.delete_column.id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
