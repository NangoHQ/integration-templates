import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ReferenceFieldSchema = z.union([
    z.string(),
    z
        .object({
            value: z.string().nullish(),
            display_value: z.string().nullish()
        })
        .passthrough(),
    z.null()
]);

function extractReferenceValue(field: unknown): string | undefined {
    if (field === null || field === undefined) {
        return undefined;
    }
    if (typeof field === 'string') {
        return field;
    }
    const parsed = z
        .object({
            value: z.string().nullish(),
            display_value: z.string().nullish()
        })
        .passthrough()
        .safeParse(field);
    if (parsed.success) {
        return parsed.data.value ?? undefined;
    }
    return undefined;
}

const ProviderProblemSchema = z.object({
    sys_id: z.string(),
    number: z.string().nullish(),
    short_description: z.string().nullish(),
    description: z.string().nullish(),
    state: z.string().nullish(),
    priority: z.string().nullish(),
    impact: z.string().nullish(),
    urgency: z.string().nullish(),
    sys_updated_on: z.string(),
    sys_created_on: z.string().nullish(),
    assigned_to: ReferenceFieldSchema,
    assignment_group: ReferenceFieldSchema,
    opened_by: ReferenceFieldSchema,
    resolved_by: ReferenceFieldSchema,
    close_code: z.string().nullish(),
    close_notes: z.string().nullish()
});

const ProblemSchema = z.object({
    id: z.string(),
    number: z.string().optional(),
    short_description: z.string().optional(),
    description: z.string().optional(),
    state: z.string().optional(),
    priority: z.string().optional(),
    impact: z.string().optional(),
    urgency: z.string().optional(),
    sys_updated_on: z.string(),
    sys_created_on: z.string().optional(),
    assigned_to: z.string().optional(),
    assignment_group: z.string().optional(),
    opened_by: z.string().optional(),
    resolved_by: z.string().optional(),
    close_code: z.string().optional(),
    close_notes: z.string().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const sync = createSync({
    description: 'Sync problems.',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Problem: ProblemSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const updatedAfter = checkpoint?.updated_after;

        const proxyConfig: ProxyConfiguration = {
            // https://developer.servicenow.com/dev.do#!/reference/api/now/table/problem
            endpoint: '/api/now/table/problem',
            params: {
                // Inclusive boundary: records sharing the checkpoint timestamp must be re-included, or they
                // can be permanently skipped after a page/run boundary. batchSave upserts by id, so
                // re-saving the boundary record(s) is safe.
                sysparm_query: updatedAfter ? `sys_updated_on>=${updatedAfter}^ORDERBYsys_updated_on` : 'ORDERBYsys_updated_on'
            },
            paginate: {
                type: 'link',
                link_rel_in_response_header: 'next',
                limit_name_in_request: 'sysparm_limit',
                response_path: 'result',
                limit: 100
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const parsed = z.array(ProviderProblemSchema).safeParse(page);
            if (!parsed.success) {
                throw new Error(`Failed to parse problem records: ${parsed.error.message}`);
            }

            const problems = parsed.data.map((record) => {
                const assignedTo = extractReferenceValue(record.assigned_to);
                const assignmentGroup = extractReferenceValue(record.assignment_group);
                const openedBy = extractReferenceValue(record.opened_by);
                const resolvedBy = extractReferenceValue(record.resolved_by);

                return {
                    id: record.sys_id,
                    ...(record.number != null && { number: record.number }),
                    ...(record.short_description != null && { short_description: record.short_description }),
                    ...(record.description != null && { description: record.description }),
                    ...(record.state != null && { state: record.state }),
                    ...(record.priority != null && { priority: record.priority }),
                    ...(record.impact != null && { impact: record.impact }),
                    ...(record.urgency != null && { urgency: record.urgency }),
                    sys_updated_on: record.sys_updated_on,
                    ...(record.sys_created_on != null && { sys_created_on: record.sys_created_on }),
                    ...(assignedTo != null && { assigned_to: assignedTo }),
                    ...(assignmentGroup != null && { assignment_group: assignmentGroup }),
                    ...(openedBy != null && { opened_by: openedBy }),
                    ...(resolvedBy != null && { resolved_by: resolvedBy }),
                    ...(record.close_code != null && { close_code: record.close_code }),
                    ...(record.close_notes != null && { close_notes: record.close_notes })
                };
            });

            if (problems.length === 0) {
                continue;
            }

            await nango.batchSave(problems, 'Problem');

            const lastProblem = problems[problems.length - 1];
            if (lastProblem) {
                await nango.saveCheckpoint({
                    updated_after: lastProblem.sys_updated_on
                });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
