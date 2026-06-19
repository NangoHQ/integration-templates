import { createAction } from 'nango';
import * as z from 'zod';

const InputSchema = z.object({
    count: z.number().optional(),
    offset: z.number().optional(),
    before_create_time: z.string().optional(),
    since_create_time: z.string().optional(),
    before_start_time: z.string().optional(),
    since_start_time: z.string().optional(),
    status: z.enum(['save', 'paused', 'sending']).optional()
});

const AutomationSchema = z.object({
    id: z.string(),
    create_time: z.string().optional().nullable(),
    start_time: z.string().optional().nullable(),
    status: z.string().optional().nullable(),
    emails_sent: z.number().optional().nullable(),
    recipients: z.record(z.string(), z.unknown()).optional().nullable(),
    settings: z.record(z.string(), z.unknown()).optional().nullable(),
    tracking: z.record(z.string(), z.unknown()).optional().nullable(),
    report_summary: z.record(z.string(), z.unknown()).optional().nullable()
});

const OutputSchema = z.object({
    automations: z.array(AutomationSchema),
    total_items: z.number(),
    next_offset: z.number().optional().nullable()
});

const action = createAction({
    description: 'List automations from Mailchimp',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['automations:read'],
    exec: async (nango, input) => {
        const params: Record<string, string | number> = {};
        if (input.count !== undefined) {
            params['count'] = input.count;
        }
        if (input.offset !== undefined) {
            params['offset'] = input.offset;
        }
        if (input.before_create_time !== undefined) {
            params['before_create_time'] = input.before_create_time;
        }
        if (input.since_create_time !== undefined) {
            params['since_create_time'] = input.since_create_time;
        }
        if (input.before_start_time !== undefined) {
            params['before_start_time'] = input.before_start_time;
        }
        if (input.since_start_time !== undefined) {
            params['since_start_time'] = input.since_start_time;
        }
        if (input.status !== undefined) {
            params['status'] = input.status;
        }

        // https://mailchimp.com/developer/marketing/api/automation/
        const response = await nango.get({
            endpoint: '/3.0/automations',
            params,
            retries: 3
        });

        const MailchimpResponseSchema = z.object({
            automations: z.array(AutomationSchema),
            total_items: z.number().optional()
        });

        const parsed = MailchimpResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                message: 'Invalid response from Mailchimp API'
            });
        }

        const automations = parsed.data.automations;
        const total_items = parsed.data.total_items ?? 0;
        const offset = input.offset ?? 0;
        const count = input.count ?? 10;
        const next_offset = offset + count < total_items ? offset + count : null;

        return {
            automations,
            total_items,
            next_offset
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
