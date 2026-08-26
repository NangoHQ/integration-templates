import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderAutomationSchema = z.object({
    id: z.string(),
    name: z.string(),
    cdate: z.string().optional(),
    mdate: z.string().optional(),
    userid: z.string().optional(),
    status: z.union([z.string(), z.number()]).optional(),
    entered: z.string().optional(),
    exited: z.string().optional(),
    hidden: z.string().optional(),
    description: z.string().nullable().optional(),
    exit_on_unsubscribe: z.string().optional(),
    exit_on_conversion: z.string().optional(),
    multientry: z.string().optional(),
    source: z.string().optional(),
    entitlements_violation: z.string().optional()
});

const AutomationSchema = z.object({
    id: z.string(),
    name: z.string(),
    cdate: z.string().optional(),
    mdate: z.string().optional(),
    userid: z.string().optional(),
    status: z.union([z.string(), z.number()]).optional(),
    entered: z.string().optional(),
    exited: z.string().optional(),
    hidden: z.string().optional(),
    description: z.string().optional(),
    exit_on_unsubscribe: z.string().optional(),
    exit_on_conversion: z.string().optional(),
    multientry: z.string().optional(),
    source: z.string().optional(),
    entitlements_violation: z.string().optional()
});

const sync = createSync({
    description: 'Sync automations from ActiveCampaign.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Automation: AutomationSchema
    },
    endpoints: [
        // https://developers.activecampaign.com/reference/list-all-automations
        {
            method: 'GET',
            path: '/syncs/automations'
        }
    ],

    exec: async (nango) => {
        // Blocker: ActiveCampaign /automations does not support a changed-since filter,
        // modified-since filter, cursor, or deleted-record endpoint.
        await nango.trackDeletesStart('Automation');

        const proxyConfig: ProxyConfiguration = {
            // https://developers.activecampaign.com/reference/list-all-automations
            endpoint: '/3/automations',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'offset',
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'limit',
                limit: 20,
                response_path: 'automations'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            if (!Array.isArray(page)) {
                throw new Error('Expected automations page to be an array');
            }

            const parsed = z.array(ProviderAutomationSchema).safeParse(page);
            if (!parsed.success) {
                throw new Error('Failed to parse automations page: ' + parsed.error.message);
            }

            const automations = parsed.data
                .filter((automation) => automation.id != null)
                .map((automation) => ({
                    id: automation.id,
                    name: automation.name,
                    ...(automation.cdate != null && { cdate: automation.cdate }),
                    ...(automation.mdate != null && { mdate: automation.mdate }),
                    ...(automation.userid != null && { userid: automation.userid }),
                    ...(automation.status != null && { status: automation.status }),
                    ...(automation.entered != null && { entered: automation.entered }),
                    ...(automation.exited != null && { exited: automation.exited }),
                    ...(automation.hidden != null && { hidden: automation.hidden }),
                    ...(automation.description != null && { description: automation.description }),
                    ...(automation.exit_on_unsubscribe != null && { exit_on_unsubscribe: automation.exit_on_unsubscribe }),
                    ...(automation.exit_on_conversion != null && { exit_on_conversion: automation.exit_on_conversion }),
                    ...(automation.multientry != null && { multientry: automation.multientry }),
                    ...(automation.source != null && { source: automation.source }),
                    ...(automation.entitlements_violation != null && { entitlements_violation: automation.entitlements_violation })
                }));

            if (automations.length > 0) {
                await nango.batchSave(automations, 'Automation');
            }
        }

        await nango.trackDeletesEnd('Automation');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
