import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
        limit: z.number().int().min(1).max(100).optional().describe('Maximum number of macros to return per page. Defaults to 30.'),
        search: z.string().optional().describe('Free-text search query to filter macros by name or content.'),
        tags: z.array(z.string()).optional().describe('Tag names to filter macros by. Only macros with all specified tags are returned.'),
        languages: z.array(z.string()).optional().describe('Language codes to filter macros by (e.g., "en", "fr").'),
        message_id: z.number().int().optional().describe('Return macros ranked by relevance to the specified message ID.'),
        ticket_id: z.number().int().optional().describe('Return macros ranked by relevance to the specified ticket ID.'),
        number_predictions: z.number().int().optional().describe('Number of macro predictions to return when ranking by relevance.'),
        archived: z.boolean().optional().describe('Whether to include archived macros. Defaults to false.'),
        order_by: z.string().optional().describe('Sort order, e.g., "created_datetime:desc" or "updated_datetime:asc".')
    })
    .describe('Input parameters for listing macros from the Gorgias API.');

const ProviderTagSchema = z.object({
    id: z.number().int(),
    name: z.string(),
    uri: z.string().optional()
});

const ProviderMacroSchema = z.object({
    id: z.number().int(),
    name: z.string().optional(),
    description: z.string().optional(),
    tags: z.array(ProviderTagSchema).optional(),
    language: z.string().optional(),
    created_datetime: z.string().nullable().optional(),
    updated_datetime: z.string().nullable().optional(),
    archived: z.boolean().optional(),
    uri: z.string().optional()
});

const ProviderMetaSchema = z.object({
    prev_cursor: z.string().nullable().optional(),
    next_cursor: z.string().nullable().optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderMacroSchema),
    meta: ProviderMetaSchema
});

const MacroSchema = z.object({
    id: z.number().int().describe('Unique identifier of the macro.'),
    name: z.string().optional().describe('Name of the macro.'),
    description: z.string().optional().describe('Description of the macro.'),
    tags: z
        .array(
            z.object({
                id: z.number().int().describe('Tag ID.'),
                name: z.string().describe('Tag name.'),
                uri: z.string().optional().describe('Tag resource URI.')
            })
        )
        .optional()
        .describe('Tags associated with the macro.'),
    language: z.string().optional().describe('Language code of the macro.'),
    created_datetime: z.string().optional().describe('ISO 8601 timestamp when the macro was created.'),
    updated_datetime: z.string().optional().describe('ISO 8601 timestamp when the macro was last updated.'),
    archived: z.boolean().optional().describe('Whether the macro is archived.'),
    uri: z.string().optional().describe('Resource URI of the macro.')
});

const OutputSchema = z
    .object({
        items: z.array(MacroSchema).describe('List of macros matching the query.'),
        next_cursor: z.string().optional().describe('Cursor to fetch the next page. Omit if absent or undefined.')
    })
    .describe('Response shape for the list-macros action.');

/**
 * @tags: [read]
 * @tagReason: Reads macros from the provider via a GET request.
 * @pitfalls: Archived macros may be excluded by default; pass archived=true explicitly to include them.
 */
const action = createAction({
    description:
        'List macros (canned response templates), optionally searched, filtered by tags/language/archived state, or ranked by relevance to a ticket/message.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number | string[]> = {};

        if (input.cursor !== undefined) {
            params['cursor'] = input.cursor;
        }
        if (input.limit !== undefined) {
            params['limit'] = input.limit;
        }
        if (input.search !== undefined) {
            params['search'] = input.search;
        }
        if (input.tags !== undefined) {
            params['tags'] = input.tags;
        }
        if (input.languages !== undefined) {
            params['languages'] = input.languages;
        }
        if (input.message_id !== undefined) {
            params['message_id'] = input.message_id;
        }
        if (input.ticket_id !== undefined) {
            params['ticket_id'] = input.ticket_id;
        }
        if (input.number_predictions !== undefined) {
            params['number_predictions'] = input.number_predictions;
        }
        if (input.archived !== undefined) {
            params['archived'] = String(input.archived);
        }
        if (input.order_by !== undefined) {
            params['order_by'] = input.order_by;
        }

        // https://developers.gorgias.com/reference/list-macros
        const response = await nango.get({
            endpoint: '/api/macros',
            params,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            items: providerResponse.data.map((macro) => ({
                id: macro.id,
                ...(macro.name !== undefined && { name: macro.name }),
                ...(macro.description !== undefined && { description: macro.description }),
                ...(macro.tags !== undefined && {
                    tags: macro.tags.map((tag) => ({
                        id: tag.id,
                        name: tag.name,
                        ...(tag.uri !== undefined && { uri: tag.uri })
                    }))
                }),
                ...(macro.language !== undefined && { language: macro.language }),
                ...(macro.created_datetime != null && { created_datetime: macro.created_datetime }),
                ...(macro.updated_datetime != null && { updated_datetime: macro.updated_datetime }),
                ...(macro.archived !== undefined && { archived: macro.archived }),
                ...(macro.uri !== undefined && { uri: macro.uri })
            })),
            ...(providerResponse.meta.next_cursor !== undefined &&
                providerResponse.meta.next_cursor !== null && { next_cursor: providerResponse.meta.next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
