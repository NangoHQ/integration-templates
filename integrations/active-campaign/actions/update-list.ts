import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('List ID. Example: "4"'),
    name: z.string().optional(),
    stringid: z.string().optional(),
    sender_url: z.string().optional(),
    sender_reminder: z.string().optional(),
    send_last_broadcast: z.boolean().optional(),
    carboncopy: z.string().nullable().optional(),
    subscription_notify: z.string().nullable().optional(),
    unsubscription_notify: z.string().nullable().optional(),
    user: z.number().optional(),
    channel: z.string().optional()
});

const ProviderListSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    stringid: z.string().optional(),
    sender_url: z.string().optional(),
    sender_reminder: z.string().optional(),
    send_last_broadcast: z.string().optional(),
    carboncopy: z.string().nullable().optional(),
    subscription_notify: z.string().nullable().optional(),
    unsubscription_notify: z.string().nullable().optional(),
    user: z.string().optional(),
    channel: z.string().optional(),
    cdate: z.string().optional(),
    udate: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    stringid: z.string().optional(),
    sender_url: z.string().optional(),
    sender_reminder: z.string().optional(),
    send_last_broadcast: z.boolean().optional(),
    carboncopy: z.string().nullable().optional(),
    subscription_notify: z.string().nullable().optional(),
    unsubscription_notify: z.string().nullable().optional(),
    user: z.number().optional(),
    channel: z.string().optional(),
    cdate: z.string().optional(),
    udate: z.string().optional()
});

const action = createAction({
    description: 'Update a list in ActiveCampaign.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-list',
        group: 'Lists'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.activecampaign.com/reference/lists
        const response = await nango.patch({
            endpoint: `/3/lists/${encodeURIComponent(input.id)}`,
            data: {
                list: {
                    ...(input.name !== undefined && { name: input.name }),
                    ...(input.stringid !== undefined && { stringid: input.stringid }),
                    ...(input.sender_url !== undefined && { sender_url: input.sender_url }),
                    ...(input.sender_reminder !== undefined && { sender_reminder: input.sender_reminder }),
                    ...(input.send_last_broadcast !== undefined && { send_last_broadcast: input.send_last_broadcast ? 1 : 0 }),
                    ...(input.carboncopy !== undefined && { carboncopy: input.carboncopy }),
                    ...(input.subscription_notify !== undefined && { subscription_notify: input.subscription_notify }),
                    ...(input.unsubscription_notify !== undefined && { unsubscription_notify: input.unsubscription_notify }),
                    ...(input.user !== undefined && { user: input.user }),
                    ...(input.channel !== undefined && { channel: input.channel })
                }
            },
            retries: 3
        });

        const raw = z.object({ list: z.unknown() }).parse(response.data);
        const providerList = ProviderListSchema.parse(raw.list);

        const parsedSendLastBroadcast =
            providerList.send_last_broadcast !== undefined
                ? providerList.send_last_broadcast === '1' || providerList.send_last_broadcast === 'true'
                : undefined;

        const parsedUser = providerList.user !== undefined ? parseInt(providerList.user, 10) : undefined;

        return {
            id: providerList.id,
            ...(providerList.name !== undefined && { name: providerList.name }),
            ...(providerList.stringid !== undefined && { stringid: providerList.stringid }),
            ...(providerList.sender_url !== undefined && { sender_url: providerList.sender_url }),
            ...(providerList.sender_reminder !== undefined && { sender_reminder: providerList.sender_reminder }),
            ...(parsedSendLastBroadcast !== undefined && { send_last_broadcast: parsedSendLastBroadcast }),
            ...(providerList.carboncopy !== undefined && { carboncopy: providerList.carboncopy }),
            ...(providerList.subscription_notify !== undefined && { subscription_notify: providerList.subscription_notify }),
            ...(providerList.unsubscription_notify !== undefined && { unsubscription_notify: providerList.unsubscription_notify }),
            ...(parsedUser !== undefined && !Number.isNaN(parsedUser) && { user: parsedUser }),
            ...(providerList.channel !== undefined && { channel: providerList.channel }),
            ...(providerList.cdate !== undefined && { cdate: providerList.cdate }),
            ...(providerList.udate != null && { udate: providerList.udate })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
