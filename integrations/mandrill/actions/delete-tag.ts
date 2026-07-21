import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    tag: z.string().describe('The tag name to delete. Example: "newsletter"')
});

const ProviderDeleteTagResponseSchema = z.object({
    tag: z.string(),
    sent: z.number().int(),
    hard_bounces: z.number().int(),
    soft_bounces: z.number().int(),
    rejects: z.number().int(),
    complaints: z.number().int(),
    unsubs: z.number().int(),
    opens: z.number().int(),
    clicks: z.number().int(),
    unique_opens: z.number().int(),
    unique_clicks: z.number().int(),
    reputation: z.number().int()
});

const OutputSchema = z.object({
    tag: z.string(),
    sent: z.number().int(),
    hard_bounces: z.number().int(),
    soft_bounces: z.number().int(),
    rejects: z.number().int(),
    complaints: z.number().int(),
    unsubs: z.number().int(),
    opens: z.number().int(),
    clicks: z.number().int(),
    unique_opens: z.number().int(),
    unique_clicks: z.number().int(),
    reputation: z.number().int()
});

const action = createAction({
    description: 'Permanently delete a tag and its stats.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://mailchimp.com/developer/transactional/api/tags/delete-tag/
            endpoint: '/1.0/tags/delete',
            data: {
                tag: input.tag
            },
            retries: 3
        };

        const response = await nango.post(config);

        const parsed = ProviderDeleteTagResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'The API response did not match the expected schema.',
                details: parsed.error.issues
            });
        }

        return parsed.data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
