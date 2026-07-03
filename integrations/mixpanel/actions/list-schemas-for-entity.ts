import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.number().int().describe('Your Mixpanel project ID. Example: 4040293'),
    entity_type: z.enum(['event', 'profile', 'group', 'lookup']).describe('The entity type. Valid values: event, profile, group, lookup.'),
    limit: z.number().int().positive().optional().describe('Maximum number of schemas to return per page. Defaults to 100.'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const SchemaPropertyDefinitionSchema = z
    .object({
        type: z.enum(['array', 'boolean', 'integer', 'null', 'number', 'object', 'string']),
        description: z.string().optional(),
        metadata: z
            .object({
                'com.mixpanel': z
                    .object({
                        displayName: z.string().optional(),
                        hidden: z.boolean().optional(),
                        dropped: z.boolean().optional()
                    })
                    .passthrough()
                    .optional()
            })
            .passthrough()
            .optional()
    })
    .passthrough();

const SchemaSchema = z
    .object({
        description: z.string().optional(),
        properties: z.record(z.string(), SchemaPropertyDefinitionSchema).optional(),
        metadata: z
            .object({
                'com.mixpanel': z
                    .object({
                        $source: z.string().optional(),
                        displayName: z.string().optional(),
                        tags: z.array(z.string()).optional(),
                        hidden: z.boolean().optional(),
                        dropped: z.boolean().optional(),
                        contacts: z.array(z.string()).optional(),
                        teamContacts: z.array(z.string()).optional()
                    })
                    .passthrough()
                    .optional()
            })
            .passthrough()
            .optional()
    })
    .passthrough();

const ProviderSchemaEntrySchema = z.object({
    entityType: z.string(),
    name: z.string(),
    schemaJson: SchemaSchema
});

const ProviderResponseSchema = z.object({
    results: z.array(ProviderSchemaEntrySchema),
    status: z.string()
});

const SchemaOutputSchema = z.object({
    entityType: z.string(),
    name: z.string(),
    schemaJson: z.unknown()
});

const OutputSchema = z.object({
    results: z.array(SchemaOutputSchema),
    next_cursor: z.string().optional()
});

const DEFAULT_LIMIT = 100;

const action = createAction({
    description: 'List Lexicon schemas for an entity type.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const limit = input.limit ?? DEFAULT_LIMIT;
        const offset = input.cursor ? parseInt(input.cursor, 10) : 0;

        if (isNaN(offset) || offset < 0) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a non-negative integer string.'
            });
        }

        // https://developer.mixpanel.com/reference/list-schemas-for-entity
        const response = await nango.get({
            endpoint: `/api/app/projects/${encodeURIComponent(String(input.project_id))}/schemas/${encodeURIComponent(input.entity_type)}`,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const allResults = providerResponse.results;
        const paginatedResults = allResults.slice(offset, offset + limit);
        const nextOffset = offset + paginatedResults.length;

        return {
            results: paginatedResults.map((entry) => ({
                entityType: entry.entityType,
                name: entry.name,
                schemaJson: entry.schemaJson
            })),
            ...(nextOffset < allResults.length && { next_cursor: String(nextOffset) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
