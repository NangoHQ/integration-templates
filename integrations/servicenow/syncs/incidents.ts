import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const IncidentSchema = z.object({
    id: z.string(),
    sys_id: z.string(),
    number: z.string(),
    short_description: z.string().optional(),
    description: z.string().optional(),
    state: z.string().optional(),
    priority: z.string().optional(),
    impact: z.string().optional(),
    urgency: z.string().optional(),
    category: z.string().optional(),
    subcategory: z.string().optional(),
    caller_id: z.string().optional(),
    assigned_to: z.string().optional(),
    assignment_group: z.string().optional(),
    opened_by: z.string().optional(),
    sys_created_on: z.string().optional(),
    sys_updated_on: z.string().optional(),
    resolved_at: z.string().optional(),
    closed_at: z.string().optional(),
    close_code: z.string().optional(),
    close_notes: z.string().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const ProviderIncidentSchema = z.object({
    sys_id: z.string(),
    number: z.string(),
    short_description: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    priority: z.string().nullable().optional(),
    impact: z.string().nullable().optional(),
    urgency: z.string().nullable().optional(),
    category: z.string().nullable().optional(),
    subcategory: z.string().nullable().optional(),
    caller_id: z.string().nullable().optional(),
    assigned_to: z.string().nullable().optional(),
    assignment_group: z.string().nullable().optional(),
    opened_by: z.string().nullable().optional(),
    sys_created_on: z.string().nullable().optional(),
    sys_updated_on: z.string().nullable().optional(),
    resolved_at: z.string().nullable().optional(),
    closed_at: z.string().nullable().optional(),
    close_code: z.string().nullable().optional(),
    close_notes: z.string().nullable().optional()
});

const sync = createSync({
    description: 'Sync incidents',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Incident: IncidentSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();

        const queryParts: string[] = [];
        if (checkpoint?.updated_after) {
            // Inclusive boundary: records sharing the checkpoint timestamp with the last-seen record must be
            // re-included, or they can be permanently skipped after a page/run boundary. batchSave upserts by
            // id, so re-saving the boundary record(s) is safe.
            queryParts.push(`sys_updated_on>=${checkpoint.updated_after}`);
        }
        queryParts.push('ORDERBYsys_updated_on');
        const sysparmQuery = queryParts.join('^');

        const proxyConfig: ProxyConfiguration = {
            // https://developer.servicenow.com/dev.do#!/reference/api/now/table
            endpoint: '/api/now/table/incident',
            params: {
                sysparm_query: sysparmQuery,
                sysparm_display_value: 'false',
                sysparm_exclude_reference_link: 'true'
            },
            paginate: {
                type: 'link',
                link_rel_in_response_header: 'next',
                response_path: 'result',
                limit_name_in_request: 'sysparm_limit',
                limit: 100
            },
            retries: 3
        };

        for await (const rawPage of nango.paginate(proxyConfig)) {
            const validatedRecords = rawPage.map((raw) => {
                const parsed = ProviderIncidentSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse incident: ${parsed.error.message}`);
                }
                return parsed.data;
            });

            if (validatedRecords.length === 0) {
                continue;
            }

            const incidents = validatedRecords.map((record) => ({
                id: record.sys_id,
                sys_id: record.sys_id,
                number: record.number,
                ...(record.short_description != null && { short_description: record.short_description }),
                ...(record.description != null && { description: record.description }),
                ...(record.state != null && { state: record.state }),
                ...(record.priority != null && { priority: record.priority }),
                ...(record.impact != null && { impact: record.impact }),
                ...(record.urgency != null && { urgency: record.urgency }),
                ...(record.category != null && { category: record.category }),
                ...(record.subcategory != null && { subcategory: record.subcategory }),
                ...(record.caller_id != null && { caller_id: record.caller_id }),
                ...(record.assigned_to != null && { assigned_to: record.assigned_to }),
                ...(record.assignment_group != null && { assignment_group: record.assignment_group }),
                ...(record.opened_by != null && { opened_by: record.opened_by }),
                ...(record.sys_created_on != null && { sys_created_on: record.sys_created_on }),
                ...(record.sys_updated_on != null && { sys_updated_on: record.sys_updated_on }),
                ...(record.resolved_at != null && { resolved_at: record.resolved_at }),
                ...(record.closed_at != null && { closed_at: record.closed_at }),
                ...(record.close_code != null && { close_code: record.close_code }),
                ...(record.close_notes != null && { close_notes: record.close_notes })
            }));

            await nango.batchSave(incidents, 'Incident');

            if (validatedRecords.length > 0) {
                const lastRecord = validatedRecords[validatedRecords.length - 1];
                if (lastRecord && lastRecord.sys_updated_on) {
                    await nango.saveCheckpoint({
                        updated_after: lastRecord.sys_updated_on
                    });
                }
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
