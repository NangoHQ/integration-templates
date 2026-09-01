import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        ticket_id: z.number().describe('The ID of the ticket whose tags should be listed. Example: 82682724')
    })
    .describe('Input for listing the tags currently applied to a ticket.');

const TagSchema = z.object({
    id: z.number().describe('Unique identifier of the tag. Example: 1812976'),
    name: z.string().describe('Name of the tag. Example: "sample ticket"'),
    uri: z.string().describe('API URI of the tag resource.'),
    description: z.string().optional().describe('Optional description of the tag.'),
    created_datetime: z.string().optional().describe('ISO 8601 timestamp when the tag was created.'),
    updated_datetime: z.string().optional().describe('ISO 8601 timestamp when the tag was last updated.'),
    is_archived: z.boolean().optional().describe('Whether the tag has been archived.'),
    archived_datetime: z.string().optional().describe('ISO 8601 timestamp when the tag was archived, if applicable.')
});

const OutputSchema = z
    .object({
        data: z.array(TagSchema).describe('List of tags currently applied to the ticket.')
    })
    .describe('Output containing the tags currently applied to a ticket.');

const ProviderTagSchema = z.object({
    id: z.number(),
    name: z.string(),
    uri: z.string(),
    description: z.string().nullable().optional(),
    created_datetime: z.string().nullable().optional(),
    updated_datetime: z.string().nullable().optional(),
    is_archived: z.boolean().nullable().optional(),
    archived_datetime: z.string().nullable().optional()
});

/**
 * @tags: [read]
 * @tagReason: Reads the tags currently applied to a ticket.
 */
const action = createAction({
    description: 'List tags currently applied to a ticket.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.gorgias.com/reference/list-ticket-tags
            endpoint: `/api/tickets/${encodeURIComponent(input.ticket_id)}/tags`,
            retries: 3
        });

        const rawData = response.data;

        if (!rawData || typeof rawData !== 'object' || !Array.isArray(rawData.data)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from the Gorgias API.'
            });
        }

        const tags = rawData.data.map((item: unknown) => {
            const parsed = ProviderTagSchema.safeParse(item);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'A tag in the response did not match the expected schema.',
                    details: parsed.error.format()
                });
            }

            return {
                id: parsed.data.id,
                name: parsed.data.name,
                uri: parsed.data.uri,
                ...(parsed.data.description != null && { description: parsed.data.description }),
                ...(parsed.data.created_datetime != null && { created_datetime: parsed.data.created_datetime }),
                ...(parsed.data.updated_datetime != null && { updated_datetime: parsed.data.updated_datetime }),
                ...(parsed.data.is_archived != null && { is_archived: parsed.data.is_archived }),
                ...(parsed.data.archived_datetime != null && { archived_datetime: parsed.data.archived_datetime })
            };
        });

        return {
            data: tags
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
