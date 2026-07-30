import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    organization_id: z.union([z.string(), z.number()]).describe('Organization ID. Example: "775646"'),
    time_slot_start: z.string().describe('Start of the time slot in ISO 8601 format. Example: "2026-07-29T00:00:00Z"'),
    time_slot_stop: z.string().describe('End of the time slot in ISO 8601 format. Example: "2026-07-29T23:59:59Z"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ProviderNoteSchema = z.object({
    id: z.union([z.string(), z.number()]),
    note: z.string().optional().nullable(),
    body: z.string().optional().nullable(),
    content: z.string().optional().nullable(),
    user_id: z.union([z.string(), z.number()]).optional().nullable(),
    project_id: z.union([z.string(), z.number()]).optional().nullable(),
    created_at: z.string().optional().nullable(),
    updated_at: z.string().optional().nullable()
});

const NoteSchema = z.object({
    id: z.string(),
    note: z.string().optional(),
    user_id: z.string().optional(),
    project_id: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const OutputSchema = z.object({
    notes: z.array(NoteSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List notes attached to tracked time, within a date range.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['hubstaff:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const startDate = new Date(input.time_slot_start);
        const stopDate = new Date(input.time_slot_stop);

        if (isNaN(startDate.getTime()) || isNaN(stopDate.getTime())) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'time_slot_start and time_slot_stop must be valid ISO 8601 date strings.'
            });
        }

        if (startDate >= stopDate) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'time_slot_start must be earlier than time_slot_stop.'
            });
        }

        const response = await nango.get({
            // https://developer.hubstaff.com/
            endpoint: `v2/organizations/${encodeURIComponent(String(input.organization_id))}/notes`,
            params: {
                'time_slot[start]': input.time_slot_start,
                'time_slot[stop]': input.time_slot_stop,
                ...(input.cursor !== undefined && { page_start_id: input.cursor })
            },
            retries: 3
        });

        const ProviderListResponseSchema = z.union([
            z.array(ProviderNoteSchema),
            z
                .object({
                    notes: z.array(ProviderNoteSchema).optional(),
                    pagination: z.object({ next_page_start_id: z.union([z.string(), z.number()]).optional() }).optional()
                })
                .passthrough()
        ]);

        const providerResponse = ProviderListResponseSchema.parse(response.data);
        const providerNotes = Array.isArray(providerResponse) ? providerResponse : (providerResponse.notes ?? []);
        const nextCursor =
            !Array.isArray(providerResponse) && providerResponse.pagination?.next_page_start_id !== undefined
                ? String(providerResponse.pagination.next_page_start_id)
                : undefined;

        const notes = providerNotes.map((item) => {
            const maybeNote = item.note ?? item.body ?? item.content;
            return {
                id: String(item.id),
                ...(maybeNote != null && { note: maybeNote }),
                ...(item.user_id != null && { user_id: String(item.user_id) }),
                ...(item.project_id != null && { project_id: String(item.project_id) }),
                ...(item.created_at != null && { created_at: item.created_at }),
                ...(item.updated_at != null && { updated_at: item.updated_at })
            };
        });

        return {
            notes,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
