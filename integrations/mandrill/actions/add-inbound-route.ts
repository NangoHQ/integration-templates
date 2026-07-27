import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    domain: z.string().describe('An existing inbound domain. Example: "inbound.example.com"'),
    pattern: z.string().describe('The search pattern that the mailbox name should match. Example: "mailbox-*"'),
    url: z.string().describe('The webhook URL where the inbound messages will be published. Example: "https://example.com/webhook-url"')
});

const ProviderRouteSchema = z.object({
    id: z.string(),
    pattern: z.string(),
    url: z.string()
});

const OutputSchema = z.object({
    id: z.string(),
    pattern: z.string(),
    url: z.string()
});

const action = createAction({
    description: 'Add a new mailbox route to an inbound domain.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://mailchimp.com/developer/transactional/api/inbound/add-route/
            endpoint: '/1.0/inbound/add-route.json',
            data: {
                domain: input.domain,
                pattern: input.pattern,
                url: input.url
            },
            retries: 1
        });

        const route = ProviderRouteSchema.parse(response.data);

        return {
            id: route.id,
            pattern: route.pattern,
            url: route.url
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
