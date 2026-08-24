import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderGroupSchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullable().optional(),
    business_hour_id: z.number().nullable().optional(),
    escalate_to: z.number().nullable().optional(),
    unassigned_for: z.string().nullable().optional(),
    auto_ticket_assign: z.number().optional(),
    agent_ids: z.array(z.number()).optional(),
    created_at: z.string(),
    updated_at: z.string()
});

const GroupSchema = z
    .object({
        id: z.string().describe('Unique identifier of the group'),
        name: z.string().describe('Name of the group'),
        description: z.string().optional().describe('Description of the group'),
        business_hour_id: z.number().optional().describe('Unique ID of the business hour associated with the group'),
        escalate_to: z.number().optional().describe('The ID of the user to whom an escalation email is sent if a ticket remains unassigned'),
        unassigned_for: z.string().optional().describe('The time after which an escalation email is sent if a ticket remains unassigned'),
        auto_ticket_assign: z.number().optional().describe('Describes the type of automatic ticket assignment set for the group'),
        agent_ids: z.array(z.number()).optional().describe('Array of agent user IDs belonging to the group'),
        created_at: z.string().describe('Group creation timestamp in UTC format'),
        updated_at: z.string().describe('Group last updated timestamp in UTC format')
    })
    .describe('Freshdesk support group');

function mapGroups(pageResults: unknown[]): z.infer<typeof GroupSchema>[] {
    return pageResults.map((raw) => {
        const parsed = ProviderGroupSchema.safeParse(raw);
        if (!parsed.success) {
            throw new Error(`Failed to parse group: ${parsed.error.message}`);
        }
        const record = parsed.data;
        return {
            id: String(record.id),
            name: record.name,
            ...(record.description != null && { description: record.description }),
            ...(record.business_hour_id != null && { business_hour_id: record.business_hour_id }),
            ...(record.escalate_to != null && { escalate_to: record.escalate_to }),
            ...(record.unassigned_for != null && { unassigned_for: record.unassigned_for }),
            ...(record.auto_ticket_assign != null && { auto_ticket_assign: record.auto_ticket_assign }),
            ...(record.agent_ids != null && { agent_ids: record.agent_ids }),
            created_at: record.created_at,
            updated_at: record.updated_at
        };
    });
}

const sync = createSync({
    description: 'Sync groups from Freshdesk',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Group: GroupSchema
    },

    // Delete-tracked syncs must always start from page 1 and complete a full enumeration
    // per Nango requirements; there is no resumable checkpoint.
    exec: async (nango) => {
        const proxyConfig: ProxyConfiguration = {
            // https://developers.freshdesk.com/api/#list_all_groups
            endpoint: '/api/v2/groups',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100
            },
            retries: 3
        };

        const iterator = nango.paginate(proxyConfig);

        // Fetch and validate the first page before opening the delete-tracking window, so a
        // transient empty or invalid response can't wipe out previously-synced records. An empty
        // first page is inconclusive (it may be a transient provider glitch rather than a genuine
        // zero-record account), so skip this run entirely rather than opening a tracking window
        // that would delete every previously-synced record; the next scheduled run retries.
        const first = await iterator.next();
        if (first.done) {
            return;
        }
        const firstGroups = mapGroups(first.value);
        if (firstGroups.length === 0) {
            return;
        }

        await nango.trackDeletesStart('Group');

        await nango.batchSave(firstGroups, 'Group');

        let next = await iterator.next();
        while (!next.done) {
            const groups = mapGroups(next.value);
            if (groups.length > 0) {
                await nango.batchSave(groups, 'Group');
            }
            next = await iterator.next();
        }

        await nango.trackDeletesEnd('Group');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
