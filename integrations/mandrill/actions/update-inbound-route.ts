import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The unique identifier of an existing mailbox route. Example: "12.123456"'),
    pattern: z.string().nullable().optional().describe('The search pattern that the mailbox name should match. Pass null to leave unchanged.'),
    url: z.string().nullable().optional().describe('The webhook URL where inbound messages will be published. Pass null to leave unchanged.')
});

const ProviderRouteSchema = z.object({
    id: z.string(),
    pattern: z.string(),
    url: z.string()
});

const OutputSchema = z.object({
    id: z.string(),
    pattern: z.string().optional(),
    url: z.string().optional()
});

const action = createAction({
    description: 'Update the pattern or destination webhook of an existing inbound route.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://mailchimp.com/developer/transactional/api/inbound/
            endpoint: '/inbound/update-route',
            data: {
                id: input.id,
                ...(input.pattern !== undefined && { pattern: input.pattern }),
                ...(input.url !== undefined && { url: input.url })
            },
            retries: 3
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
