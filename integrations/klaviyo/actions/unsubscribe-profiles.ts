import { z } from 'zod';
import { createAction } from 'nango';

const ProfileInputSchema = z.object({
    email: z.string().optional().describe('Profile email address. Example: "user@example.com"'),
    phone_number: z.string().optional().describe('Profile phone number in E.164 format. Example: "+15005550006"')
});

const InputSchema = z.object({
    list_id: z.string().describe('The list ID to remove profiles from. Example: "XW53Ha"'),
    profiles: z
        .array(ProfileInputSchema)
        .min(1)
        .max(100)
        .describe('The profiles to unsubscribe. Either email or phone_number is required per profile. Maximum 100 profiles.')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Unsubscribe profiles from email/SMS marketing on a list.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['lists:write', 'profiles:write', 'subscriptions:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body = {
            data: {
                type: 'profile-subscription-bulk-delete-job',
                attributes: {
                    profiles: {
                        data: input.profiles.map((profile) => ({
                            type: 'profile',
                            attributes: {
                                ...(profile.email !== undefined && { email: profile.email }),
                                ...(profile.phone_number !== undefined && { phone_number: profile.phone_number }),
                                subscriptions: {
                                    ...(profile.email !== undefined && {
                                        email: {
                                            marketing: {
                                                consent: 'UNSUBSCRIBED'
                                            }
                                        }
                                    }),
                                    ...(profile.phone_number !== undefined && {
                                        sms: {
                                            marketing: {
                                                consent: 'UNSUBSCRIBED'
                                            }
                                        }
                                    })
                                }
                            }
                        }))
                    }
                },
                relationships: {
                    list: {
                        data: {
                            type: 'list',
                            id: input.list_id
                        }
                    }
                }
            }
        };

        // https://developers.klaviyo.com/en/reference/bulk_unsubscribe_profiles
        await nango.post({
            endpoint: '/api/profile-subscription-bulk-delete-jobs',
            headers: {
                revision: '2026-04-15'
            },
            data: body,
            retries: 3
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
