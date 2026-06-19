import { z } from 'zod';
import { createAction } from 'nango';

// Input schema for retrieving a page property item
const InputSchema = z.object({
    page_id: z.string().describe('The ID of the page containing the property. Example: "b55c9c91-384d-452b-81db-d1ef79372b75"'),
    property_id: z
        .string()
        .describe(
            'The ID or name of the property to retrieve. Can be a property ID (e.g., "title", "%3E%5DWj") or property name (e.g., "Name", "Status"). Property IDs are more stable if properties are renamed.'
        ),
    start_cursor: z
        .string()
        .optional()
        .describe('Pagination cursor for properties with many values (title, rich_text, relation, people). Omit for the first page.'),
    page_size: z.number().min(1).max(100).optional().describe('Number of results to return per page. Maximum is 100. Default: 100.')
});

// Schema for property item object (simple property types)
const PropertyItemSchema = z
    .object({
        object: z.literal('property_item'),
        id: z.string(),
        type: z.string()
        // The actual value is stored under a key matching the type
        // This will be handled as passthrough for flexibility
    })
    .passthrough();

// Schema for paginated list response (for title, rich_text, relation, people, rollup)
const PropertyItemListSchema = z.object({
    object: z.literal('list'),
    type: z.string(),
    results: z.array(z.object({}).passthrough()),
    next_cursor: z.string().nullable().optional(),
    has_more: z.boolean(),
    // Property item metadata in list response is a simpler object
    property_item: z.object({}).passthrough().optional()
});

// Output schema that can be either a single property item or a paginated list
const OutputSchema = z.union([PropertyItemSchema, PropertyItemListSchema]);

const action = createAction({
    description: 'Retrieve a single property item value from a page.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read.content'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.notion.com/reference/retrieve-a-page-property-item
        const response = await nango.get({
            endpoint: `/v1/pages/${encodeURIComponent(input.page_id)}/properties/${encodeURIComponent(input.property_id)}`,
            params: {
                ...(input.start_cursor && { start_cursor: input.start_cursor }),
                ...(input.page_size !== undefined && { page_size: input.page_size.toString() })
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Page property not found',
                page_id: input.page_id,
                property_id: input.property_id
            });
        }

        // The response can be either a single property_item or a paginated list
        // Use type guard to safely check response structure
        if (typeof response.data !== 'object' || response.data === null) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Response data is not an object'
            });
        }

        // Safely access the object property using bracket notation
        const responseData = response.data;
        const objectType = 'object' in responseData ? responseData.object : undefined;

        if (objectType === 'property_item') {
            // Single property item
            const parsed = PropertyItemSchema.safeParse(responseData);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'validation_error',
                    message: 'Failed to parse property item response',
                    errors: parsed.error.issues
                });
            }
            return parsed.data;
        } else if (objectType === 'list') {
            // Paginated list of property items
            const parsed = PropertyItemListSchema.safeParse(responseData);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'validation_error',
                    message: 'Failed to parse property item list response',
                    errors: parsed.error.issues
                });
            }
            return parsed.data;
        } else {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Unexpected response object type from Notion API',
                object_type: String(objectType)
            });
        }
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
