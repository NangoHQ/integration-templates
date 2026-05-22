import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';
import type { OffsetPagination } from '@nangohq/types';

// Provider response schema for a single automation
// https://mailchimp.com/developer/marketing/api/automation/list-automations/
const ProviderAutomationSchema = z.object({
    id: z.string(),
    create_time: z.string(),
    start_time: z.string().nullable().optional(),
    status: z.string(),
    emails_sent: z.number().optional(),
    recipients: z.record(z.string(), z.unknown()).optional(),
    settings: z.record(z.string(), z.unknown()).optional(),
    tracking: z.record(z.string(), z.unknown()).optional(),
    trigger_settings: z.record(z.string(), z.unknown()).optional(),
    report_summary: z.record(z.string(), z.unknown()).optional()
});

// Normalized model schema for Nango
const AutomationSchema = z.object({
    id: z.string(),
    create_time: z.string(),
    start_time: z.string().optional(),
    status: z.string(),
    emails_sent: z.number().optional(),
    title: z.string().optional(),
    from_name: z.string().optional(),
    reply_to: z.string().optional(),
    list_id: z.string().optional(),
    list_name: z.string().optional(),
    workflow_type: z.string().optional()
});

const sync = createSync({
    description: 'Sync automations from Mailchimp.',
    version: '1.0.0',
    endpoints: [{ method: 'GET', path: '/syncs/automations' }],
    frequency: 'every hour',
    autoStart: true,
    models: {
        Automation: AutomationSchema
    },

    exec: async (nango) => {
        // Blocker: Mailchimp only supports create/start-time filters for this collection.
        // Automation status, recipient settings, and report summary fields can all change
        // after creation, so a create-time checkpoint would miss legitimate updates.
        await nango.trackDeletesStart('Automation');

        const paginateConfig: OffsetPagination = {
            type: 'offset',
            offset_name_in_request: 'offset',
            offset_start_value: 0,
            limit_name_in_request: 'count',
            limit: 100,
            response_path: 'automations'
        };

        const proxyConfig: ProxyConfiguration = {
            // https://mailchimp.com/developer/marketing/api/automation/list-automations/
            endpoint: '/3.0/automations',
            paginate: paginateConfig,
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const parsedPage = z.array(ProviderAutomationSchema).safeParse(page);

            if (!parsedPage.success) {
                throw new Error(`Failed to parse automations: ${parsedPage.error.message}`);
            }

            const automations: Array<{
                id: string;
                create_time: string;
                start_time?: string;
                status: string;
                emails_sent?: number;
                title?: string;
                from_name?: string;
                reply_to?: string;
                list_id?: string;
                list_name?: string;
                workflow_type?: string;
            }> = parsedPage.data.map((automation) => {
                const settings = automation.settings;
                const recipients = automation.recipients;
                const triggerSettings = automation.trigger_settings;

                const result: {
                    id: string;
                    create_time: string;
                    status: string;
                    start_time?: string;
                    emails_sent?: number;
                    title?: string;
                    from_name?: string;
                    reply_to?: string;
                    list_id?: string;
                    list_name?: string;
                    workflow_type?: string;
                } = {
                    id: automation.id,
                    create_time: automation.create_time,
                    status: automation.status
                };

                if (automation.start_time != null) {
                    result.start_time = automation.start_time;
                }

                if (automation.emails_sent != null) {
                    result.emails_sent = automation.emails_sent;
                }

                if (settings && typeof settings === 'object') {
                    const title = settings['title'];
                    if (title != null) {
                        result.title = String(title);
                    }
                    const fromName = settings['from_name'];
                    if (fromName != null) {
                        result.from_name = String(fromName);
                    }
                    const replyTo = settings['reply_to'];
                    if (replyTo != null) {
                        result.reply_to = String(replyTo);
                    }
                }

                if (recipients && typeof recipients === 'object') {
                    const listId = recipients['list_id'];
                    if (listId != null) {
                        result.list_id = String(listId);
                    }
                    const listName = recipients['list_name'];
                    if (listName != null) {
                        result.list_name = String(listName);
                    }
                }

                if (triggerSettings && typeof triggerSettings === 'object') {
                    const workflowType = triggerSettings['workflow_type'];
                    if (workflowType != null) {
                        result.workflow_type = String(workflowType);
                    }
                }

                return result;
            });

            if (automations.length > 0) {
                await nango.batchSave(automations, 'Automation');
            }
        }

        await nango.trackDeletesEnd('Automation');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
