import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderAuthenticatorSchema = z
    .object({
        id: z.string(),
        name: z.string(),
        type: z.string(),
        status: z.string(),
        key: z.string().optional(),
        created: z.string().optional(),
        lastUpdated: z.string().optional(),
        settings: z.record(z.string(), z.unknown()).optional(),
        _links: z.record(z.string(), z.unknown()).optional()
    })
    .passthrough();

const OutputSchema = z.object({
    authenticators: z.array(
        z
            .object({
                id: z.string(),
                name: z.string(),
                type: z.string(),
                status: z.string(),
                key: z.string().optional(),
                created: z.string().optional(),
                lastUpdated: z.string().optional()
            })
            .passthrough()
    )
});

const action = createAction({
    description: 'List the authenticator types configured at the org level.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['okta.authenticators.read'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.okta.com/docs/reference/api/authenticators/
            endpoint: '/api/v1/authenticators',
            retries: 3
        });

        const raw = response.data;
        if (!Array.isArray(raw)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Expected an array of authenticators from the Okta API.'
            });
        }

        const authenticators = raw.map((item: unknown) => {
            const parsed = ProviderAuthenticatorSchema.safeParse(item);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Authenticator item failed validation.',
                    details: parsed.error.issues
                });
            }
            return parsed.data;
        });

        return { authenticators };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
