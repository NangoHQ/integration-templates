import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    tableId: z.number().describe('The ID of the table to list fields for. Example: 1080602')
});

const SelectOptionSchema = z.object({
    id: z.number(),
    value: z.string(),
    color: z.string().optional()
});

const ProviderFieldSchema = z
    .object({
        id: z.number(),
        table_id: z.number(),
        name: z.string(),
        order: z.number(),
        type: z.string(),
        primary: z.boolean(),
        read_only: z.boolean().optional(),
        description: z.string().optional().nullable(),
        select_options: z.array(SelectOptionSchema).optional(),
        link_row_table_id: z.number().optional().nullable(),
        link_row_related_field_id: z.number().optional().nullable(),
        date_format: z.string().optional().nullable(),
        date_include_time: z.boolean().optional().nullable(),
        number_decimal_places: z.number().optional().nullable(),
        number_negative: z.boolean().optional().nullable(),
        text_alignment: z.string().optional().nullable()
    })
    .passthrough();

const OutputSchema = z.object({
    fields: z.array(ProviderFieldSchema).describe('The list of fields in the table.')
});

const action = createAction({
    description: 'List the fields (columns) of a table.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://nango.dev/docs/api-integrations/baserow
        // https://api.baserow.io/api/redoc/
        const response = await nango.get({
            endpoint: `/database/fields/table/${encodeURIComponent(String(input.tableId))}/`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'No fields found or table does not exist.'
            });
        }

        const parsed = z.array(ProviderFieldSchema).safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'validation_error',
                message: 'Failed to parse provider response.',
                details: parsed.error.issues
            });
        }

        return {
            fields: parsed.data
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
