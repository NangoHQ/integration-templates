import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(100).optional().describe('Number of results per page. Maximum is 100.'),
    search: z.string().optional().describe('Search term to filter automations by name.')
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
    defaultscreenshot: z.string().optional(),
    screenshot: z.string().optional(),
    links: z.record(z.string(), z.string()).optional()
});

const ProviderMetaSchema = z.object({
    total: z.string().optional()
});

const ProviderResponseSchema = z.object({
    automations: z.array(ProviderAutomationSchema),
    meta: ProviderMetaSchema.optional()
});

const AutomationSchema = z.object({
    id: z.string(),
    name: z.string(),
    cdate: z.string().optional(),
    mdate: z.string().optional(),
    userid: z.string().optional(),
    status: z.string().optional(),
    entered: z.string().optional(),
    exited: z.string().optional(),
    hidden: z.string().optional(),
    defaultscreenshot: z.string().optional(),
    screenshot: z.string().optional()
});

const OutputSchema = z.object({
    automations: z.array(AutomationSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List automations from ActiveCampaign.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const limit = input.limit ?? 20;
        const offset = input.cursor ? parseInt(input.cursor, 10) : 0;
        if (input.cursor && (Number.isNaN(offset) || offset < 0 || String(offset) !== input.cursor)) {
            throw new nango.ActionError({ type: 'invalid_input', message: 'cursor must be a valid non-negative integer string.' });
        }

        const response = await nango.get({
            // https://developers.activecampaign.com/reference/list-all-automations
            endpoint: '/3/automations',
            params: {
                limit: String(limit),
                offset: String(offset),
                ...(input.search !== undefined && { search: input.search })
            },
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);
        const total = providerData.meta?.total ? parseInt(providerData.meta.total, 10) : null;
        const nextOffset = offset + providerData.automations.length;
        const hasMore = total !== null ? nextOffset < total : providerData.automations.length === limit;

        return {
            automations: providerData.automations.map((automation) => ({
                id: automation.id,
                name: automation.name,
                ...(automation.cdate !== undefined && { cdate: automation.cdate }),
                ...(automation.mdate !== undefined && { mdate: automation.mdate }),
                ...(automation.userid !== undefined && { userid: automation.userid }),
                ...(automation.status !== undefined && { status: automation.status }),
                ...(automation.entered !== undefined && { entered: automation.entered }),
                ...(automation.exited !== undefined && { exited: automation.exited }),
                ...(automation.hidden !== undefined && { hidden: automation.hidden }),
                ...(automation.defaultscreenshot !== undefined && { defaultscreenshot: automation.defaultscreenshot }),
                ...(automation.screenshot !== undefined && { screenshot: automation.screenshot })
            })),
            ...(hasMore && { next_cursor: String(nextOffset) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
