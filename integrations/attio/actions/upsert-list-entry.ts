import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    list_id: z.string().describe('A UUID or slug of the list. Example: "39723680-f534-4fe7-ab80-c5278e20e37b"'),
    parent_record_id: z.string().describe('A UUID identifying the record to add to the list. Example: "4c6ade84-19c7-4581-95aa-b1d5f4571c25"'),
    parent_object: z.string().describe('A UUID or slug identifying the object that the parent record belongs to. Example: "people"'),
    entry_values: z.record(z.string(), z.array(z.unknown())).optional().describe('Optional map of attribute API slugs to arrays of values.')
});

const CreatedByActorSchema = z.object({
    id: z.string().nullable(),
    type: z.string().nullable()
});

const EntryValueSchema = z
    .object({
        active_from: z.string(),
        active_until: z.string().nullable(),
        created_by_actor: CreatedByActorSchema,
        attribute_type: z.string()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    data: z.object({
        id: z.object({
            workspace_id: z.string(),
            list_id: z.string(),
            entry_id: z.string()
        }),
        parent_record_id: z.string(),
        parent_object: z.string(),
        created_at: z.string(),
        entry_values: z.record(z.string(), z.array(EntryValueSchema))
    })
});

const OutputSchema = z.object({
    id: z.object({
        workspace_id: z.string(),
        list_id: z.string(),
        entry_id: z.string()
    }),
    parent_record_id: z.string(),
    parent_object: z.string(),
    created_at: z.string(),
    entry_values: z.record(z.string(), z.array(EntryValueSchema))
});

const action = createAction({
    description: 'Create or update a list entry in Attio by matching parent record.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['list_entry:read-write', 'list_configuration:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://docs.attio.com/rest-api/endpoint-reference/entries/upsert-a-list-entry-by-parent
            endpoint: `/v2/lists/${input.list_id}/entries`,
            data: {
                data: {
                    parent_record_id: input.parent_record_id,
                    parent_object: input.parent_object,
                    entry_values: input.entry_values ?? {}
                }
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Attio API returned an empty response.'
            });
        }

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            id: parsed.data.id,
            parent_record_id: parsed.data.parent_record_id,
            parent_object: parsed.data.parent_object,
            created_at: parsed.data.created_at,
            entry_values: parsed.data.entry_values
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
