import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Automation ID. Example: "1"')
});

const AutomationLinksSchema = z.object({
    campaigns: z.string().optional(),
    contactGoals: z.string().optional(),
    contactAutomations: z.string().optional(),
    blocks: z.string().optional(),
    goals: z.string().optional(),
    sms: z.string().optional(),
    sitemessages: z.string().optional(),
    triggers: z.string().optional()
});

const ProviderAutomationSchema = z.object({
    id: z.string(),
    name: z.string(),
    cdate: z.string().optional(),
    mdate: z.string().optional(),
    userid: z.string().optional(),
    status: z.string().optional(),
    entered: z.string().optional(),
    exited: z.string().optional(),
    hidden: z.string().optional(),
    entitlements_violation: z.string().optional(),
    source: z.string().optional(),
    description: z.string().nullable().optional(),
    exit_on_unsubscribe: z.string().optional(),
    exit_on_conversion: z.string().optional(),
    multientry: z.string().optional(),
    defaultscreenshot: z.string().optional(),
    screenshot: z.string().optional(),
    links: AutomationLinksSchema.optional()
});

const ProviderResponseSchema = z.object({
    automation: ProviderAutomationSchema
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    cdate: z.string().optional(),
    mdate: z.string().optional(),
    userid: z.string().optional(),
    status: z.string().optional(),
    entered: z.string().optional(),
    exited: z.string().optional(),
    hidden: z.string().optional(),
    entitlements_violation: z.string().optional(),
    source: z.string().optional(),
    description: z.string().optional(),
    exit_on_unsubscribe: z.string().optional(),
    exit_on_conversion: z.string().optional(),
    multientry: z.string().optional(),
    defaultscreenshot: z.string().optional(),
    screenshot: z.string().optional(),
    links: AutomationLinksSchema.optional()
});

const action = createAction({
    description: 'Retrieve a single automation from ActiveCampaign.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-automation',
        group: 'Automations'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.activecampaign.com/reference/retrieve-an-automation
            endpoint: `/3/automations/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const providerAutomation = providerResponse.automation;

        return {
            id: providerAutomation.id,
            name: providerAutomation.name,
            ...(providerAutomation.cdate !== undefined && { cdate: providerAutomation.cdate }),
            ...(providerAutomation.mdate !== undefined && { mdate: providerAutomation.mdate }),
            ...(providerAutomation.userid !== undefined && { userid: providerAutomation.userid }),
            ...(providerAutomation.status !== undefined && { status: providerAutomation.status }),
            ...(providerAutomation.entered !== undefined && { entered: providerAutomation.entered }),
            ...(providerAutomation.exited !== undefined && { exited: providerAutomation.exited }),
            ...(providerAutomation.hidden !== undefined && { hidden: providerAutomation.hidden }),
            ...(providerAutomation.entitlements_violation !== undefined && { entitlements_violation: providerAutomation.entitlements_violation }),
            ...(providerAutomation.source !== undefined && { source: providerAutomation.source }),
            ...(providerAutomation.description != null && { description: providerAutomation.description }),
            ...(providerAutomation.exit_on_unsubscribe !== undefined && { exit_on_unsubscribe: providerAutomation.exit_on_unsubscribe }),
            ...(providerAutomation.exit_on_conversion !== undefined && { exit_on_conversion: providerAutomation.exit_on_conversion }),
            ...(providerAutomation.multientry !== undefined && { multientry: providerAutomation.multientry }),
            ...(providerAutomation.defaultscreenshot !== undefined && { defaultscreenshot: providerAutomation.defaultscreenshot }),
            ...(providerAutomation.screenshot !== undefined && { screenshot: providerAutomation.screenshot }),
            ...(providerAutomation.links !== undefined && { links: providerAutomation.links })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
