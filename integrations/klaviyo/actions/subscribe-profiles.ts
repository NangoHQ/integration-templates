import { z } from 'zod';
import { createAction } from 'nango';

const MarketingConsentSchema = z.object({
    consent: z.enum(['SUBSCRIBED', 'UNSUBSCRIBED', 'NEVER_SUBSCRIBED', 'SUBSCRIBED_PENDING_DOUBLE_OPTIN'])
});

const SubscriptionsSchema = z.object({
    email: z
        .object({
            marketing: MarketingConsentSchema.optional()
        })
        .optional(),
    sms: z
        .object({
            marketing: MarketingConsentSchema.optional()
        })
        .optional()
});

const ProfileInputSchema = z.object({
    email: z.string().optional().describe('Profile email address. Example: "user@example.com"'),
    phone_number: z.string().optional().describe('Profile phone number in E.164 format. Example: "+15005550006"'),
    subscriptions: SubscriptionsSchema.optional()
});

const InputSchema = z.object({
    list_id: z.string().describe('The ID of the list to subscribe profiles to. Example: "XW53Ha"'),
    profiles: z.array(ProfileInputSchema).describe('Array of profiles to subscribe.')
});

const OutputSchema = z.object({
    success: z.boolean(),
    list_id: z.string()
});

const action = createAction({
    description: 'Subscribe profiles to email/SMS marketing on a list.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['lists:write', 'profiles:write', 'subscriptions:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        for (const profile of input.profiles) {
            if (!profile.email && !profile.phone_number) {
                throw new nango.ActionError({
                    type: 'invalid_input',
                    message: 'Each profile must have at least one of email or phone_number.'
                });
            }
        }

        const profilesData = input.profiles.map((profile) => {
            const attributes: Record<string, unknown> = {};
            if (profile.email !== undefined) {
                attributes['email'] = profile.email;
            }
            if (profile.phone_number !== undefined) {
                attributes['phone_number'] = profile.phone_number;
            }
            if (profile.subscriptions !== undefined) {
                attributes['subscriptions'] = profile.subscriptions;
            }
            return {
                type: 'profile',
                attributes
            };
        });

        const body = {
            data: {
                type: 'profile-subscription-bulk-create-job',
                attributes: {
                    profiles: {
                        data: profilesData
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

        // https://developers.klaviyo.com/en/reference/create_profile_subscription_bulk_create_job
        await nango.post({
            endpoint: '/api/profile-subscription-bulk-create-jobs',
            data: body,
            headers: {
                revision: '2026-04-15'
            },
            retries: 3
        });

        return {
            success: true,
            list_id: input.list_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
