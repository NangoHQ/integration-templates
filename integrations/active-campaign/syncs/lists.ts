import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderListSchema = z.object({
    id: z.string(),
    name: z.string(),
    stringid: z.string(),
    userid: z.string(),
    cdate: z.string(),
    udate: z.string().nullable().optional(),
    sender_url: z.string().nullable().optional(),
    sender_reminder: z.string().nullable().optional(),
    private: z.string(),
    require_name: z.string(),
    optinoptout: z.string(),
    send_last_broadcast: z.string(),
    to_name: z.string()
});

const ListSchema = z.object({
    id: z.string(),
    name: z.string(),
    stringid: z.string(),
    userid: z.string(),
    cdate: z.string(),
    udate: z.string().optional(),
    sender_url: z.string().optional(),
    sender_reminder: z.string().optional(),
    private: z.string(),
    require_name: z.string(),
    optinoptout: z.string(),
    send_last_broadcast: z.string(),
    to_name: z.string()
});

const sync = createSync({
    description: 'Sync lists from ActiveCampaign.',
    version: '1.0.0',
    endpoints: [{ method: 'GET', path: '/syncs/lists' }],
    frequency: 'every hour',
    autoStart: true,
    models: {
        List: ListSchema
    },

    exec: async (nango) => {
        await nango.trackDeletesStart('List');

        const proxyConfig: ProxyConfiguration = {
            // https://developers.activecampaign.com/reference/retrieve-all-lists
            endpoint: '/3/lists',
            paginate: {
                type: 'offset',
                limit_name_in_request: 'limit',
                limit: 100,
                offset_name_in_request: 'offset',
                response_path: 'lists'
            },
            retries: 3
        };

        for await (const batch of nango.paginate(proxyConfig)) {
            const providerLists = z.array(ProviderListSchema).safeParse(batch);

            if (!providerLists.success) {
                throw new Error(`Failed to parse lists: ${providerLists.error.message}`);
            }

            const lists = providerLists.data.map((list) => ({
                id: list.id,
                name: list.name,
                stringid: list.stringid,
                userid: list.userid,
                cdate: list.cdate,
                ...(list.udate != null && { udate: list.udate }),
                ...(list.sender_url != null && { sender_url: list.sender_url }),
                ...(list.sender_reminder != null && { sender_reminder: list.sender_reminder }),
                private: list.private,
                require_name: list.require_name,
                optinoptout: list.optinoptout,
                send_last_broadcast: list.send_last_broadcast,
                to_name: list.to_name
            }));

            if (lists.length > 0) {
                await nango.batchSave(lists, 'List');
            }
        }

        await nango.trackDeletesEnd('List');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
