import { z } from 'zod';
import { createAction } from 'nango';

const StatsWindowSchema = z.object({
    sent: z.number().optional(),
    hard_bounces: z.number().optional(),
    soft_bounces: z.number().optional(),
    rejects: z.number().optional(),
    complaints: z.number().optional(),
    unsubs: z.number().optional(),
    opens: z.number().optional(),
    unique_opens: z.number().optional(),
    clicks: z.number().optional(),
    unique_clicks: z.number().optional()
});

const ProviderTagSchema = z.object({
    tag: z.string(),
    sent: z.number(),
    hard_bounces: z.number(),
    soft_bounces: z.number(),
    rejects: z.number(),
    complaints: z.number(),
    unsubs: z.number(),
    opens: z.number(),
    clicks: z.number(),
    unique_opens: z.number(),
    unique_clicks: z.number(),
    reputation: z.number(),
    stats: z.object({
        today: StatsWindowSchema,
        last_7_days: StatsWindowSchema,
        last_30_days: StatsWindowSchema,
        last_60_days: StatsWindowSchema,
        last_90_days: StatsWindowSchema
    })
});

const InputSchema = z.object({
    tag: z.string().describe('The tag name to look up. Example: "newsletter"')
});

const OutputSchema = z.object({
    tag: z.string(),
    sent: z.number(),
    hard_bounces: z.number(),
    soft_bounces: z.number(),
    rejects: z.number(),
    complaints: z.number(),
    unsubs: z.number(),
    opens: z.number(),
    clicks: z.number(),
    unique_opens: z.number(),
    unique_clicks: z.number(),
    reputation: z.number(),
    stats: z.object({
        today: StatsWindowSchema,
        last_7_days: StatsWindowSchema,
        last_30_days: StatsWindowSchema,
        last_60_days: StatsWindowSchema,
        last_90_days: StatsWindowSchema
    })
});

const action = createAction({
    description: 'Get detailed information about a single tag.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://mailchimp.com/developer/transactional/api/tags/get-tag-info/
            endpoint: 'tags/info.json',
            data: {
                tag: input.tag
            },
            retries: 3,
            baseUrlOverride: 'https://mandrillapp.com/api/1.0'
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Tag not found',
                tag: input.tag
            });
        }

        const providerTag = ProviderTagSchema.parse(response.data);

        return {
            tag: providerTag.tag,
            sent: providerTag.sent,
            hard_bounces: providerTag.hard_bounces,
            soft_bounces: providerTag.soft_bounces,
            rejects: providerTag.rejects,
            complaints: providerTag.complaints,
            unsubs: providerTag.unsubs,
            opens: providerTag.opens,
            clicks: providerTag.clicks,
            unique_opens: providerTag.unique_opens,
            unique_clicks: providerTag.unique_clicks,
            reputation: providerTag.reputation,
            stats: providerTag.stats
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
