import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    list_id: z.string().describe('A UUID or slug identifying the list the entry is in. Example: "33ebdbe9-e529-47c9-b894-0ba25e9c15c0"'),
    entry_id: z.string().describe('A UUID identifying the entry. Example: "2e6e29ea-c4e0-4f44-842d-78a891f8c156"')
});

const CreatedByActorSchema = z.object({
    id: z.string().nullable().optional(),
    type: z.enum(['api-token', 'workspace-member', 'system', 'app']).nullable().optional()
});

const EntryValueSchema = z
    .object({
        active_from: z.string(),
        active_until: z.string().nullable(),
        created_by_actor: CreatedByActorSchema,
        attribute_type: z.string()
    })
    .passthrough();

const EntryIdSchema = z.object({
    workspace_id: z.string(),
    list_id: z.string(),
    entry_id: z.string()
});

const ProviderEntrySchema = z.object({
    id: EntryIdSchema,
    parent_record_id: z.string(),
    parent_object: z.string(),
    created_at: z.string(),
    entry_values: z.record(z.string(), z.array(EntryValueSchema))
});

const OutputSchema = z.object({
    id: EntryIdSchema,
    parent_record_id: z.string(),
    parent_object: z.string(),
    created_at: z.string(),
    entry_values: z.record(z.string(), z.array(EntryValueSchema))
});

const action = createAction({
    description: 'Retrieve a single list entry from Attio.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['list_entry:read', 'list_configuration:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.attio.com/rest-api/endpoint-reference/entries/get-a-list-entry
            endpoint: `/v2/lists/${input.list_id}/entries/${input.entry_id}`,
            retries: 3
        });

        const raw = response.data;
        if (!raw || typeof raw !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid or empty response from Attio API.'
            });
        }

        const entry = 'data' in raw && raw.data != null ? raw.data : raw;
        const providerEntry = ProviderEntrySchema.parse(entry);

        return {
            id: providerEntry.id,
            parent_record_id: providerEntry.parent_record_id,
            parent_object: providerEntry.parent_object,
            created_at: providerEntry.created_at,
            entry_values: providerEntry.entry_values
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
