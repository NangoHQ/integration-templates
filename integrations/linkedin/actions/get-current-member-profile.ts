import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    projection: z
        .string()
        .optional()
        .describe(
            'LinkedIn field projection to request additional profile fields. Example: "(id,firstName,lastName,profilePicture(displayImage~:playableStreams))"'
        )
});

const ProviderProfileSchema = z
    .object({
        sub: z.string(),
        name: z.string().optional(),
        given_name: z.string().optional(),
        family_name: z.string().optional(),
        picture: z.string().optional(),
        email: z.string().optional(),
        email_verified: z.union([z.boolean(), z.literal('true'), z.literal('false')]).optional(),
        locale: z
            .object({
                country: z.string().optional(),
                language: z.string().optional()
            })
            .optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    givenName: z.string().optional(),
    familyName: z.string().optional(),
    picture: z.string().optional(),
    email: z.string().optional(),
    emailVerified: z.boolean().optional(),
    locale: z
        .object({
            country: z.string().optional(),
            language: z.string().optional()
        })
        .optional()
});

const action = createAction({
    description: 'Retrieve the authenticated member profile.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-current-member-profile',
        group: 'Profile'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['openid', 'profile', 'email'],
    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2
            endpoint: '/v2/userinfo',
            retries: 3
        };

        const response = await nango.get(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Profile not found'
            });
        }

        const profile = ProviderProfileSchema.parse(response.data);

        const emailVerified = profile.email_verified === 'true' ? true : profile.email_verified === 'false' ? false : profile.email_verified;

        return {
            id: profile.sub,
            ...(profile.name !== undefined && { name: profile.name }),
            ...(profile.given_name !== undefined && { givenName: profile.given_name }),
            ...(profile.family_name !== undefined && { familyName: profile.family_name }),
            ...(profile.picture !== undefined && { picture: profile.picture }),
            ...(profile.email !== undefined && { email: profile.email }),
            ...(emailVerified !== undefined && { emailVerified: emailVerified }),
            ...(profile.locale !== undefined && { locale: profile.locale })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
