import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The unique identifier of an existing route. Example: "88.214614"')
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
    description: 'Delete an existing inbound mailbox route.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://mailchimp.com/developer/transactional/api/inbound/delete-mailbox-route/
            endpoint: '/inbound/delete-route.json',
            data: {
                id: input.id
            },
            baseUrlOverride: 'https://mandrillapp.com/api/1.0',
            retries: 1
        });

        const providerRoute = ProviderRouteSchema.parse(response.data);

        return {
            id: providerRoute.id,
            pattern: providerRoute.pattern,
            url: providerRoute.url
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
