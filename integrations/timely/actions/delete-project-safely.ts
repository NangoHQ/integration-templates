import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        account_id: z.number().int().positive().describe('Timely account ID. Discover it with the list-accounts action. Example: 1145787'),
        project_id: z.number().int().positive().describe('ID of the project to delete. Example: 5691492'),
        confirm: z
            .boolean()
            .optional()
            .describe('Set to true to delete the project even when it has logged time. Defaults to false, which blocks the deletion.'),
        since: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .optional()
            .describe('Start of the window used to check for logged time, in YYYY-MM-DD format. Defaults to 2000-01-01.'),
        upto: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .optional()
            .describe('End of the window used to check for logged time, in YYYY-MM-DD format. Defaults to 2100-01-01.')
    })
    .describe('Input for deleting a Timely project after checking it for logged time.');

const OutputSchema = z
    .object({
        deleted: z.boolean().describe('Whether the project was deleted (true) or the deletion was blocked (false).'),
        blockedBy: z.string().optional().describe('Reason the deletion was blocked. Present only when deleted is false. Example: "has_logged_time".'),
        eventCount: z.number().int().describe('Number of time entries (events) logged against the project inside the checked window.'),
        since: z.string().describe('Start date (YYYY-MM-DD) of the window checked for logged time.'),
        upto: z.string().describe('End date (YYYY-MM-DD) of the window checked for logged time.'),
        cascadeDeletedEventCount: z
            .number()
            .int()
            .optional()
            .describe('Number of time entries cascade-deleted along with the project. Present only when deleted is true.')
    })
    .describe('Result of the safe project deletion, including whether it was blocked and how many time entries were affected.');

const EventListSchema = z.array(z.unknown());

const ProxyErrorSchema = z.object({
    response: z.object({ status: z.number() }).optional()
});

const DEFAULT_SINCE = '2000-01-01';
const DEFAULT_UPTO = '2100-01-01';

/**
 * @tags: [read, write, destructive]
 * @tagReason: Reads the project's logged time (events) before deleting the project, which is a destructive mutation that cascade-deletes its events.
 * @pitfalls: Deleting a project permanently destroys every time entry logged against it; the since/upto window only controls which entries are counted, so entries outside it are not detected but are still deleted, and calling the action on an already-deleted project fails rather than reporting deleted:false.
 */
const action = createAction({
    description: 'Delete a project after checking for logged time, blocking by default unless confirm is true.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const accountId = input.account_id;
        const projectId = input.project_id;
        const since = input.since ?? DEFAULT_SINCE;
        const upto = input.upto ?? DEFAULT_UPTO;

        const eventsConfig: ProxyConfiguration = {
            // https://developer.timely.com/
            endpoint: `/1.1/${encodeURIComponent(String(accountId))}/events`,
            params: {
                project_id: String(projectId),
                since,
                upto
            },
            retries: 3
        };
        const eventsResponse = await nango.get(eventsConfig);
        const events = EventListSchema.parse(eventsResponse.data);
        const eventCount = events.length;

        if (eventCount > 0 && input.confirm !== true) {
            return {
                deleted: false,
                blockedBy: 'has_logged_time',
                eventCount,
                since,
                upto
            };
        }

        const deleteConfig: ProxyConfiguration = {
            // https://developer.timely.com/
            endpoint: `/1.1/${encodeURIComponent(String(accountId))}/projects/${encodeURIComponent(String(projectId))}`,
            retries: 3
        };
        await nango.delete(deleteConfig);

        let projectGone = false;
        // @allowTryCatch: the follow-up lookup is expected to 404, which the proxy surfaces as a thrown error.
        try {
            const verifyConfig: ProxyConfiguration = {
                // https://developer.timely.com/
                endpoint: `/1.1/${encodeURIComponent(String(accountId))}/projects/${encodeURIComponent(String(projectId))}`,
                retries: 3
            };
            const verifyResponse = await nango.get(verifyConfig);
            projectGone = verifyResponse.status === 404;
        } catch (error) {
            const parsed = ProxyErrorSchema.safeParse(error);
            projectGone = parsed.success && parsed.data.response?.status === 404;
        }

        if (!projectGone) {
            throw new nango.ActionError({
                type: 'delete_not_confirmed',
                message: 'The project was deleted but a follow-up lookup did not return 404.',
                project_id: projectId
            });
        }

        return {
            deleted: true,
            eventCount,
            since,
            upto,
            cascadeDeletedEventCount: eventCount
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
