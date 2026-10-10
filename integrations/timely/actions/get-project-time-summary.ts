import { z } from 'zod';
import { createAction } from 'nango';

const ProviderDurationSchema = z.object({
    hours: z.number(),
    minutes: z.number(),
    seconds: z.number(),
    formatted: z.string(),
    total_hours: z.number(),
    total_seconds: z.number(),
    total_minutes: z.number()
});

const ProviderMoneySchema = z.object({
    fractional: z.number(),
    formatted: z.string(),
    amount: z.number(),
    currency_code: z.string()
});

const ProviderProjectSchema = z.object({
    id: z.number(),
    name: z.string(),
    client: z.object({ id: z.number(), name: z.string() }).nullable().optional(),
    duration: ProviderDurationSchema,
    cost: ProviderMoneySchema,
    first_logged_on: z.string().nullable().optional(),
    last_logged_on: z.string().nullable().optional()
});

const ProviderEventSchema = z.object({
    id: z.number(),
    day: z.string(),
    note: z.string().nullable().optional(),
    duration: ProviderDurationSchema,
    user: z.object({ id: z.number(), name: z.string().nullable().optional() }).nullable().optional(),
    label_ids: z.array(z.number()).optional()
});

const InputSchema = z
    .object({
        account_id: z.number().int().describe('Timely account ID. Discover it with the list-accounts action. Example: 1145787'),
        project_id: z.number().int().describe('ID of the project to summarize. Example: 5698287'),
        since: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .describe('Start of the range, inclusive, in YYYY-MM-DD format. Example: "2026-10-01"'),
        upto: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .describe('End of the range, inclusive, in YYYY-MM-DD format. Example: "2026-10-31"')
    })
    .describe('Project ID plus the inclusive day range used to scope the time-entry breakdown.');

const OutputSchema = z
    .object({
        project: z
            .object({
                id: z.number().describe('Timely project ID.'),
                name: z.string().describe('Project name.'),
                client: z
                    .object({
                        id: z.number().describe('Client ID the project belongs to.'),
                        name: z.string().describe('Client name the project belongs to.')
                    })
                    .optional()
                    .describe('Client the project belongs to, omitted when the project has no client.'),
                duration: z
                    .object({
                        total_hours: z.number().describe('All-time logged hours on the project as a decimal number.'),
                        total_minutes: z.number().describe('All-time logged minutes on the project.'),
                        total_seconds: z.number().describe('All-time logged seconds on the project.'),
                        formatted: z.string().describe('All-time logged duration formatted as HH:MM.')
                    })
                    .describe('All-time logged duration on the project, not scoped to the requested range.'),
                cost: z
                    .object({
                        amount: z.number().describe('All-time cost amount on the project.'),
                        formatted: z.string().describe('All-time cost formatted with its currency symbol.'),
                        currency_code: z.string().describe('Currency code for the cost. Example: "kes"')
                    })
                    .describe('All-time cost on the project, not scoped to the requested range.'),
                first_logged_on: z.string().nullable().describe('Day (YYYY-MM-DD) of the earliest logged entry, or null when the project has no logged time.'),
                last_logged_on: z.string().nullable().describe('Day (YYYY-MM-DD) of the latest logged entry, or null when the project has no logged time.')
            })
            .describe('All-time project metadata and totals, unaffected by since/upto.'),
        range: z
            .object({
                since: z.string().describe('Start of the range that was queried, YYYY-MM-DD (inclusive).'),
                upto: z.string().describe('End of the range that was queried, YYYY-MM-DD (inclusive).'),
                total_hours: z.number().describe('Sum of logged hours across the entries inside the requested range, as a decimal number.'),
                entry_count: z.number().describe('Number of time entries inside the requested range.'),
                entries: z
                    .array(
                        z.object({
                            id: z.number().describe('Timely event (time entry) ID.'),
                            day: z.string().describe('Day the time was logged, YYYY-MM-DD.'),
                            note: z.string().optional().describe('Note on the entry, omitted when empty.'),
                            total_hours: z.number().describe('Logged duration for this entry in decimal hours.'),
                            user_id: z.number().optional().describe('ID of the user the entry belongs to, omitted when unavailable.'),
                            user_name: z.string().optional().describe('Name of the user the entry belongs to, omitted when unavailable.'),
                            label_ids: z.array(z.number()).describe('Label IDs attached to the entry; empty unless the project enables labels.')
                        })
                    )
                    .describe('Individual time entries inside the requested range.')
            })
            .describe('Date-range-scoped totals and entry breakdown.')
    })
    .describe('A project with its all-time totals and the entries/total logged inside a specific date range.');

/**
 * @tags: [read]
 * @tagReason: Fetches the project and its time entries from Timely; performs no provider mutations.
 * @pitfalls: project.duration, project.cost, and project.first_logged_on/last_logged_on are all-time values that ignore since/upto, so only range.total_hours and range.entries reflect the requested dates; a project with time logged only outside the range still returns non-null first_logged_on/last_logged_on while range.total_hours is 0.
 */
const action = createAction({
    description:
        "COMPOSITE: get a project's all-time totals AND a date-range-scoped total-plus-entry-breakdown, in one call - fills the gap left by get-project silently ignoring since/upto.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const accountId = encodeURIComponent(String(input.account_id));
        const projectId = encodeURIComponent(String(input.project_id));

        const projectResponse = await nango.get({
            // https://developer.timely.com/
            endpoint: `/1.1/${accountId}/projects/${projectId}`,
            retries: 3
        });

        const project = ProviderProjectSchema.parse(projectResponse.data);

        const eventsResponse = await nango.get({
            // https://developer.timely.com/
            endpoint: `/1.1/${accountId}/events`,
            params: {
                // Timely filters on the singular `project_id`; the plural `project_ids` is silently ignored and returns every project's events.
                project_id: input.project_id,
                since: input.since,
                upto: input.upto
            },
            retries: 3
        });

        const events = z.array(ProviderEventSchema).parse(eventsResponse.data);

        const totalHours = events.reduce((sum, event) => sum + event.duration.total_hours, 0);

        return {
            project: {
                id: project.id,
                name: project.name,
                ...(project.client != null && { client: { id: project.client.id, name: project.client.name } }),
                duration: {
                    total_hours: project.duration.total_hours,
                    total_minutes: project.duration.total_minutes,
                    total_seconds: project.duration.total_seconds,
                    formatted: project.duration.formatted
                },
                cost: {
                    amount: project.cost.amount,
                    formatted: project.cost.formatted,
                    currency_code: project.cost.currency_code
                },
                first_logged_on: project.first_logged_on ?? null,
                last_logged_on: project.last_logged_on ?? null
            },
            range: {
                since: input.since,
                upto: input.upto,
                total_hours: totalHours,
                entry_count: events.length,
                entries: events.map((event) => ({
                    id: event.id,
                    day: event.day,
                    ...(event.note != null && { note: event.note }),
                    total_hours: event.duration.total_hours,
                    ...(event.user != null && { user_id: event.user.id }),
                    ...(event.user?.name != null && { user_name: event.user.name }),
                    label_ids: event.label_ids ?? []
                }))
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
