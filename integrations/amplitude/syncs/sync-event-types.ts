import { createSync } from 'nango';
import { z } from 'zod';

const EventTypeSchema = z
    .object({
        eventType: z.string().describe('Exact event type name and natural record key within the project.'),
        category: z.string().nullable().optional().describe('Category name, or null when unset.'),
        description: z.string().nullable().optional().describe('Event documentation, preserving empty and null.'),
        displayName: z.string().nullable().optional().describe('Configured display label or null.'),
        isActive: z.boolean().optional().describe('Provider activity flag.'),
        hiddenFromDropdowns: z.boolean().optional().describe('Dropdown visibility flag.'),
        hiddenFromPersonaResults: z.boolean().optional().describe('Persona visibility flag.'),
        hiddenFromPathfinder: z.boolean().optional().describe('Pathfinder visibility flag.'),
        hiddenFromTimeline: z.boolean().optional().describe('Timeline visibility flag.'),
        tags: z.array(z.string()).optional().describe('Governance tags.'),
        owner: z.string().nullable().optional().describe('Event owner metadata.'),
        deleted: z.boolean().optional().describe('Deletion flag when the source supplies it; omitted otherwise.')
    })
    .describe('A visible event-type taxonomy definition replicated from the Amplitude project.');

type EventType = z.infer<typeof EventTypeSchema>;

// Raw shape of one record in GET /api/2/taxonomy/event. Fields the
// documentation shows as explicit null (display_name, owner) are
// nullable; fields whose presence or nullability the documentation leaves
// unclear (category, deleted, the visibility flags) are parsed defensively.
const TaxonomyEventTypeSchema = z.object({
    event_type: z.string(),
    category: z
        .object({
            name: z.string()
        })
        .nullable()
        .optional(),
    description: z.string().optional(),
    display_name: z.string().nullable().optional(),
    is_active: z.boolean().optional(),
    is_hidden_from_dropdowns: z.boolean().optional(),
    is_hidden_from_persona_results: z.boolean().optional(),
    is_hidden_from_pathfinder: z.boolean().optional(),
    is_hidden_from_timeline: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    owner: z.string().nullable().optional(),
    deleted: z.boolean().optional()
});

const TaxonomyEventTypesResponseSchema = z.object({
    data: z.array(TaxonomyEventTypeSchema)
});

const sync = createSync({
    description:
        'Replicated visible event-type taxonomy definitions, including category, documentation, ownership, tags, and visibility settings. Hidden event types excluded by the source list are not represented as a complete project inventory.',
    version: '1.0.0',
    frequency: 'every day',
    autoStart: true,
    models: {
        // @ts-expect-error - The approved public schema has no `id` property, but Nango's
        // ZodModel type requires `id: z.string()` in the model shape. The model therefore
        // omits it here; each saved record still carries a stable string `id` (the
        // eventType natural key) for record keying at runtime.
        EventType: EventTypeSchema
    },

    exec: async (nango) => {
        // Full refresh. The Taxonomy API returns every visible event type in a
        // single unpaginated response and offers no changed-since filter, so
        // there is no cursor, page, or timestamp a checkpoint could feed back
        // into the request. A failed run simply retries from the start, and
        // the delete-tracking window stays open across that retry.
        // Parse failures throw before trackDeletesEnd so a malformed response
        // can never be mistaken for an empty project and wipe the cache.
        await nango.trackDeletesStart('EventType');

        // https://amplitude.com/docs/apis/analytics/taxonomy#get-all-event-types
        const response = await nango.get({
            endpoint: '/api/2/taxonomy/event',
            params: {
                // Include soft-deleted event types so they are replicated with
                // their deleted flag instead of silently vanishing from the cache.
                showDeleted: 'true'
            },
            retries: 3
        });

        const parsed = TaxonomyEventTypesResponseSchema.parse(response.data);

        // Records are keyed on `id` at save time; eventType is the natural
        // record key within the project, so it is mirrored as the record id.
        const eventTypes: (EventType & { id: string })[] = parsed.data.map((record) => ({
            id: record.event_type,
            eventType: record.event_type,
            category: record.category?.name ?? null,
            ...(record.description !== undefined && { description: record.description }),
            ...(record.display_name !== undefined && { displayName: record.display_name }),
            ...(record.is_active !== undefined && { isActive: record.is_active }),
            ...(record.is_hidden_from_dropdowns !== undefined && { hiddenFromDropdowns: record.is_hidden_from_dropdowns }),
            ...(record.is_hidden_from_persona_results !== undefined && { hiddenFromPersonaResults: record.is_hidden_from_persona_results }),
            ...(record.is_hidden_from_pathfinder !== undefined && { hiddenFromPathfinder: record.is_hidden_from_pathfinder }),
            ...(record.is_hidden_from_timeline !== undefined && { hiddenFromTimeline: record.is_hidden_from_timeline }),
            ...(record.tags !== undefined && { tags: record.tags }),
            ...(record.owner !== undefined && { owner: record.owner }),
            ...(record.deleted !== undefined && { deleted: record.deleted })
        }));

        if (eventTypes.length > 0) {
            await nango.batchSave(eventTypes, 'EventType');
        }

        await nango.trackDeletesEnd('EventType');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
