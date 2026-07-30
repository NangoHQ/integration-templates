import { z } from 'zod';
import { createAction } from 'nango';

const ProviderProfileSchema = z.object({
    id: z.string(),
    accountId: z.string(),
    status: z.string(),
    title: z.string(),
    subdomain: z.string(),
    logo: z.string().optional().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
    locale: z.string()
});

const OutputProfileSchema = z.object({
    id: z.string(),
    accountId: z.string(),
    status: z.string(),
    title: z.string(),
    subdomain: z.string(),
    logo: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    locale: z.string()
});

const InputSchema = z.object({});

const OutputSchema = z.array(OutputProfileSchema);

const action = createAction({
    description: 'List booking-page profiles on this account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://api.youcanbook.me/v1/profiles
            endpoint: '/v1/profiles',
            retries: 3
        });

        if (!Array.isArray(response.data)) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Expected an array of profiles from the provider.'
            });
        }

        const profiles = response.data.map((item: unknown) => {
            const parsed = ProviderProfileSchema.safeParse(item);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'validation_error',
                    message: 'Provider returned a profile with an unexpected shape.',
                    details: parsed.error.issues
                });
            }

            return {
                id: parsed.data.id,
                accountId: parsed.data.accountId,
                status: parsed.data.status,
                title: parsed.data.title,
                subdomain: parsed.data.subdomain,
                ...(parsed.data.logo != null && { logo: parsed.data.logo }),
                createdAt: parsed.data.createdAt,
                updatedAt: parsed.data.updatedAt,
                locale: parsed.data.locale
            };
        });

        return profiles;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
