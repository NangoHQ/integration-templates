import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderUserSchema = z.object({
    id: z.string(),
    display_name: z.string().nullable().optional(),
    email: z.string().optional(),
    country: z.string().optional(),
    product: z.string().optional(),
    images: z
        .array(
            z.object({
                url: z.string(),
                height: z.number().nullable().optional(),
                width: z.number().nullable().optional()
            })
        )
        .optional(),
    external_urls: z.record(z.string(), z.string()).optional(),
    followers: z
        .object({
            href: z.string().nullable().optional(),
            total: z.number()
        })
        .optional(),
    href: z.string().optional(),
    type: z.string().optional(),
    uri: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    display_name: z.string().optional(),
    email: z.string().optional(),
    country: z.string().optional(),
    product: z.string().optional(),
    images: z
        .array(
            z.object({
                url: z.string(),
                height: z.number().optional(),
                width: z.number().optional()
            })
        )
        .optional(),
    external_urls: z.record(z.string(), z.string()).optional(),
    followers: z
        .object({
            href: z.string().optional(),
            total: z.number()
        })
        .optional(),
    href: z.string().optional(),
    type: z.string().optional(),
    uri: z.string().optional()
});

const action = createAction({
    description: 'Fetch the current Spotify user profile',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user-read-private', 'user-read-email'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.spotify.com/documentation/web-api/reference/get-current-users-profile
        const response = await nango.get({
            endpoint: '/v1/me',
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'User profile not found'
            });
        }

        const providerUser = ProviderUserSchema.parse(response.data);

        return {
            id: providerUser.id,
            ...(providerUser.display_name != null && { display_name: providerUser.display_name }),
            ...(providerUser.email !== undefined && { email: providerUser.email }),
            ...(providerUser.country !== undefined && { country: providerUser.country }),
            ...(providerUser.product !== undefined && { product: providerUser.product }),
            ...(providerUser.images !== undefined && {
                images: providerUser.images.map((img) => ({
                    url: img.url,
                    ...(img.height != null && { height: img.height }),
                    ...(img.width != null && { width: img.width })
                }))
            }),
            ...(providerUser.external_urls !== undefined && { external_urls: providerUser.external_urls }),
            ...(providerUser.followers !== undefined && {
                followers: {
                    ...(providerUser.followers.href != null && { href: providerUser.followers.href }),
                    total: providerUser.followers.total
                }
            }),
            ...(providerUser.href !== undefined && { href: providerUser.href }),
            ...(providerUser.type !== undefined && { type: providerUser.type }),
            ...(providerUser.uri !== undefined && { uri: providerUser.uri })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
