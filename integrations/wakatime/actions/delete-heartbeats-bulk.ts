import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        date: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .describe('Day to delete heartbeats from, in YYYY-MM-DD format, interpreted in the user\'s timezone. Example: "2026-10-10"'),
        ids: z.array(z.string()).min(1).describe('Heartbeat IDs to delete. Obtain them from the create-heartbeats-bulk response or from list-heartbeats.')
    })
    .describe('Heartbeats to permanently delete from a single day.');

const OutputSchema = z
    .object({
        date: z.string().describe('The day the deletion was scoped to, in YYYY-MM-DD format.'),
        deleted_ids: z.array(z.string()).describe('Requested heartbeat IDs that were present for the given day before the deletion and are gone after it.'),
        not_found_ids: z
            .array(z.string())
            .describe(
                'Requested heartbeat IDs that were not present for the given day before the deletion, usually because the ID or date is wrong; a heartbeat created moments ago may also land here before it becomes visible.'
            ),
        remaining_ids: z
            .array(z.string())
            .describe('Requested heartbeat IDs still present for the given day after the deletion; empty when every found heartbeat was removed.')
    })
    .describe('Result of the bulk heartbeat deletion, including which requested IDs were removed.');

const HeartbeatSchema = z.object({
    id: z.string()
});

const HeartbeatListResponseSchema = z.object({
    data: z.array(HeartbeatSchema)
});

const DeleteHeartbeatsResponseSchema = z.object({
    data: z.object({}).optional()
});

/**
 * @tags: [read, write, destructive]
 * @tagReason: Reads the day to find the given heartbeats, permanently deletes them (a destructive write), and re-reads the day to confirm they are gone.
 * @pitfalls: Heartbeats are only deleted for the given date in the user's timezone, so an ID paired with the wrong day is not removed and is reported in not_found_ids; the response never echoes the deleted IDs, so rely on the returned deleted_ids/not_found_ids/remaining_ids; deleting a heartbeat does not remove the project record it created.
 */
const action = createAction({
    description: 'Permanently delete one or more heartbeats on a given day by their IDs.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_heartbeats', 'read_heartbeats'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // The delete response is an empty object and the endpoint silently ignores IDs that are not on the given
        // day, so read the day before and after deleting to tell real deletions apart from IDs that were never there.
        // A unique param keeps the two identical reads distinct so recorded mocks replay deterministically; WakaTime ignores it.
        const listHeartbeatIds = async (snapshot: 'before' | 'after'): Promise<Set<string>> => {
            const listConfig: ProxyConfiguration = {
                // https://wakatime.com/developers#heartbeats
                endpoint: '/api/v1/users/current/heartbeats',
                params: {
                    date: input.date,
                    _nango_snapshot: snapshot
                },
                retries: 3
            };
            const listResponse = await nango.get(listConfig);
            return new Set(HeartbeatListResponseSchema.parse(listResponse.data).data.map((heartbeat) => heartbeat.id));
        };

        const presentBefore = await listHeartbeatIds('before');
        const foundIds = input.ids.filter((id) => presentBefore.has(id));
        const notFoundIds = input.ids.filter((id) => !presentBefore.has(id));

        // Every requested ID is still sent, so a heartbeat that was not yet visible in the first read is deleted too.
        const deleteConfig: ProxyConfiguration = {
            // https://wakatime.com/developers#heartbeats
            endpoint: '/api/v1/users/current/heartbeats.bulk',
            data: {
                date: input.date,
                ids: input.ids
            },
            // Deleting the same explicit IDs again is a no-op, so a retry cannot cause an extra deletion.
            retries: 3
        };
        const deleteResponse = await nango.delete(deleteConfig);
        DeleteHeartbeatsResponseSchema.parse(deleteResponse.data);

        const presentAfter = await listHeartbeatIds('after');

        return {
            date: input.date,
            deleted_ids: foundIds.filter((id) => !presentAfter.has(id)),
            not_found_ids: notFoundIds,
            remaining_ids: foundIds.filter((id) => presentAfter.has(id))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
