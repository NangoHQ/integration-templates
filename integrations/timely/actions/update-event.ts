import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        account_id: z
            .number()
            .int()
            .positive()
            .describe('Timely account ID that owns the time entry. Discover it with the list-accounts action. Example: 1145787'),
        event_id: z.number().int().positive().describe('ID of the time entry (Timely calls these "events") to update. Example: 297121910'),
        note: z.string().optional().describe('New note for the time entry. Send an empty string to clear it.'),
        day: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .optional()
            .describe('Day the time is logged for, in YYYY-MM-DD format. Example: "2026-10-09"'),
        hours: z.number().int().min(0).optional().describe('Whole hours component of the duration; merges with the existing minutes. Example: 2'),
        minutes: z.number().int().min(0).max(59).optional().describe('Minutes component of the duration (0-59); merges with the existing hours. Example: 30'),
        project_id: z.number().int().positive().optional().describe('Move the time entry to this project ID. Example: 5691496'),
        label_ids: z
            .array(z.number().int().positive())
            .optional()
            .describe('Replacement set of label IDs to attach to the entry. The target project must have labels enabled or the provider rejects the update.'),
        billable: z.boolean().optional().describe('Whether the time entry is billable.'),
        external_id: z.string().optional().describe('External identifier for the time entry. Send an empty string to clear it.')
    })
    .describe('Fields to change on an existing Timely time entry. Only the supplied fields are updated (partial merge).');

const ProviderDurationSchema = z.object({
    hours: z.number(),
    minutes: z.number(),
    total_hours: z.number()
});

const ProviderProjectSchema = z.object({
    id: z.number(),
    name: z.string()
});

const ProviderUserSchema = z.object({
    id: z.number()
});

const ProviderEventSchema = z.object({
    id: z.number(),
    uid: z.string(),
    day: z.string(),
    note: z.string().nullable(),
    duration: ProviderDurationSchema,
    project: ProviderProjectSchema.nullable(),
    label_ids: z.array(z.number()),
    billable: z.boolean(),
    estimated: z.boolean(),
    external_id: z.string().nullable(),
    user: ProviderUserSchema.nullable(),
    locked: z.boolean(),
    created_at: z.number(),
    updated_at: z.number()
});

const OutputSchema = z
    .object({
        id: z.number().int().describe('Unique ID of the updated time entry.'),
        uid: z.string().describe('Stable unique string identifier of the time entry.'),
        day: z.string().describe('Day the time is logged for, in YYYY-MM-DD format.'),
        note: z.string().nullable().describe('Note attached to the time entry, or null when there is none.'),
        hours: z.number().int().describe('Whole hours component of the duration.'),
        minutes: z.number().int().describe('Minutes component of the duration.'),
        total_hours: z.number().describe('Total duration of the entry in decimal hours. Example: 1.5'),
        project_id: z.number().int().nullable().describe('ID of the project the time is logged against, or null when none.'),
        project_name: z.string().nullable().describe('Name of the project the time is logged against, or null when none.'),
        label_ids: z.array(z.number().int()).describe('Label IDs currently attached to the entry.'),
        billable: z.boolean().describe('Whether the time entry is billable.'),
        estimated: z.boolean().describe('Whether the entry is an estimate rather than logged time.'),
        external_id: z.string().nullable().describe('External identifier for the entry, or null when there is none.'),
        user_id: z.number().int().nullable().describe('ID of the user the time is logged for, or null when unknown.'),
        locked: z.boolean().describe('Whether the entry is locked and cannot be edited.'),
        created_at: z.number().int().describe('Unix timestamp (seconds) when the entry was created.'),
        updated_at: z.number().int().describe('Unix timestamp (seconds) when the entry was last updated.')
    })
    .describe('The updated Timely time entry.');

/**
 * @tags: [write]
 * @tagReason: Updates fields on an existing time entry through a provider PUT (partial merge); it performs no reads and no deletes.
 * @pitfalls: label_ids updates are rejected with 422 unless the target project has labels enabled (enable_labels other than "none"); passing null for note or external_id is ignored, so use an empty string to clear them.
 */
const action = createAction({
    description: 'Update a logged time entry (partial merge).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['manage'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const eventBody: Record<string, unknown> = {};

        if (input.note !== undefined) {
            eventBody['note'] = input.note;
        }
        if (input.day !== undefined) {
            eventBody['day'] = input.day;
        }
        if (input.hours !== undefined) {
            eventBody['hours'] = input.hours;
        }
        if (input.minutes !== undefined) {
            eventBody['minutes'] = input.minutes;
        }
        if (input.project_id !== undefined) {
            eventBody['project_id'] = input.project_id;
        }
        if (input.label_ids !== undefined) {
            eventBody['label_ids'] = input.label_ids;
        }
        if (input.billable !== undefined) {
            eventBody['billable'] = input.billable;
        }
        if (input.external_id !== undefined) {
            eventBody['external_id'] = input.external_id;
        }

        if (Object.keys(eventBody).length === 0) {
            throw new nango.ActionError({
                type: 'no_fields',
                message: 'Provide at least one field to update.'
            });
        }

        const response = await nango.put({
            // https://developer.timely.com/ - Timely API (login-walled docs; endpoint and partial-merge behavior verified live against the sandbox connection)
            endpoint: `/1.1/${encodeURIComponent(String(input.account_id))}/events/${encodeURIComponent(String(input.event_id))}`,
            data: {
                event: eventBody
            },
            // PUT with a partial merge is idempotent, so a retry after a lost response is safe.
            retries: 3
        });

        const event = ProviderEventSchema.parse(response.data);

        return {
            id: event.id,
            uid: event.uid,
            day: event.day,
            note: event.note,
            hours: event.duration.hours,
            minutes: event.duration.minutes,
            total_hours: event.duration.total_hours,
            project_id: event.project?.id ?? null,
            project_name: event.project?.name ?? null,
            label_ids: event.label_ids,
            billable: event.billable,
            estimated: event.estimated,
            external_id: event.external_id,
            user_id: event.user?.id ?? null,
            locked: event.locked,
            created_at: event.created_at,
            updated_at: event.updated_at
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
