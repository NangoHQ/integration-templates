import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        object_type: z
            .enum(['Ticket', 'Customer'])
            .describe('The type of object the custom field applies to. Must be exactly "Ticket" or "Customer" (case-sensitive).'),
        search: z.string().optional().describe('Filter custom fields by name or label.'),
        archived: z.boolean().optional().describe('Include archived (deactivated) custom fields when true.'),
        order_by: z.string().optional().describe('Sort order, e.g. "created_datetime:desc" or "updated_datetime:asc".'),
        cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
        limit: z.number().optional().describe('Maximum number of items per page. Defaults to 30, up to 100.')
    })
    .describe('Input for listing custom field definitions for tickets or customers.');

const CustomFieldSchema = z.object({
    id: z.number().describe('Unique identifier of the custom field definition.'),
    name: z.string().optional().describe('Internal machine name of the custom field.'),
    label: z.string().optional().describe('Human-readable label shown in the UI.'),
    object_type: z.enum(['Ticket', 'Customer']).optional().describe('The object type this custom field applies to.'),
    type: z.string().optional().describe('Data type of the custom field (e.g., "string", "integer", "list", "boolean").'),
    description: z.string().optional().describe('Optional description of the custom field.'),
    deactivated_datetime: z.string().nullable().optional().describe('ISO 8601 timestamp when the field was deactivated, or null if active.'),
    position: z.number().optional().describe('Display order position of the custom field.'),
    choices: z.array(z.string()).optional().describe('Available choices for list-type custom fields.'),
    managed_type: z.string().nullable().optional().describe('Internal managed type if the field is system-managed, or null for custom fields.'),
    created_datetime: z.string().optional().describe('ISO 8601 timestamp when the custom field was created.'),
    updated_datetime: z.string().optional().describe('ISO 8601 timestamp when the custom field was last updated.')
});

const OutputSchema = z
    .object({
        data: z.array(CustomFieldSchema).describe('List of custom field definitions matching the query.'),
        next_cursor: z.string().optional().describe('Cursor to fetch the next page, or omitted if this is the last page.')
    })
    .describe('Output containing a paginated list of custom field definitions.');

/**
 * @tags: [read]
 * @tagReason: Performs a GET request to list custom field definitions from the provider.
 * @pitfalls: The API has no all-types listing mode and requires separate queries for Ticket and Customer fields; deactivated fields are included by default, and several output fields (type, choices, position) are not currently populated.
 */
const action = createAction({
    description: 'List custom field definitions for tickets or customers.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {
            object_type: input.object_type
        };

        if (input.search !== undefined) {
            params['search'] = input.search;
        }

        if (input.archived !== undefined) {
            params['archived'] = String(input.archived);
        }

        if (input.order_by !== undefined) {
            params['order_by'] = input.order_by;
        }

        if (input.cursor !== undefined) {
            params['cursor'] = input.cursor;
        }

        if (input.limit !== undefined) {
            params['limit'] = input.limit;
        }

        // https://developers.gorgias.com/reference/list-custom-fields
        const response = await nango.get({
            endpoint: '/api/custom-fields',
            params,
            retries: 3
        });

        const providerResponse = z
            .object({
                data: z.array(z.object({}).passthrough()),
                meta: z
                    .object({
                        prev_cursor: z.string().nullable().optional(),
                        next_cursor: z.string().nullable().optional()
                    })
                    .optional()
            })
            .parse(response.data);

        const data = providerResponse.data.map((item) => {
            return CustomFieldSchema.parse(item);
        });

        return {
            data,
            ...(providerResponse.meta?.next_cursor != null && {
                next_cursor: providerResponse.meta.next_cursor
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
