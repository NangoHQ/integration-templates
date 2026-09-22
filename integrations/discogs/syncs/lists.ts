import { createSync } from 'nango';
import { z } from 'zod';
import { getDiscogsUsername } from '../helpers/get-discogs-username.js';

const UserListSchema = z.object({
    id: z.string(),
    list_id: z.number(),
    name: z.string(),
    description: z.string().optional(),
    public: z.boolean().optional(),
    date_added: z.string().optional(),
    date_changed: z.string().optional(),
    resource_url: z.string().optional()
});

const ListItemSchema = z.object({
    id: z.string(),
    list_id: z.number(),
    item_id: z.number(),
    type: z.string(),
    release_id: z.number().optional(),
    position: z.number(),
    display_title: z.string().optional(),
    comment: z.string().optional(),
    uri: z.string().optional(),
    resource_url: z.string().optional(),
    image_url: z.string().optional()
});

const ProviderUserListSchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullish(),
    public: z.boolean().nullish(),
    date_added: z.string().nullish(),
    date_changed: z.string().nullish(),
    resource_url: z.string().nullish()
});

const ProviderListItemSchema = z
    .object({
        id: z.number(),
        type: z.string(),
        display_title: z.string().nullish(),
        comment: z.string().nullish(),
        uri: z.string().nullish(),
        resource_url: z.string().nullish(),
        image_url: z.string().nullish()
    })
    .passthrough();

const ProviderListDetailSchema = z.object({
    items: z.array(ProviderListItemSchema)
});

const ProviderListsPageSchema = z.object({
    lists: z.array(ProviderUserListSchema),
    pagination: z
        .object({
            page: z.number(),
            pages: z.number(),
            per_page: z.number(),
            items: z.number()
        })
        .passthrough()
});

const sync = createSync({
    description: 'Sync user lists and their items.',
    version: '1.0.0',
    frequency: 'every day',
    autoStart: true,
    syncType: 'full',
    endpoints: [
        { method: 'GET', path: '/lists', group: 'Lists' },
        { method: 'GET', path: '/list-items', group: 'Lists' }
    ],
    models: {
        UserList: UserListSchema,
        ListItem: ListItemSchema
    },

    exec: async (nango) => {
        const username = await getDiscogsUsername(nango);
        const perPage = 100;

        // https://www.discogs.com/developers#page:user-list,header-user-list-user-lists
        const firstResponse = await nango.get({
            endpoint: `/users/${encodeURIComponent(username)}/lists`,
            params: { page: 1, per_page: perPage },
            retries: 3
        });

        const firstPage = ProviderListsPageSchema.parse(firstResponse.data);

        await nango.trackDeletesStart('UserList');
        await nango.trackDeletesStart('ListItem');

        const userLists: z.infer<typeof UserListSchema>[] = [];

        const processListsPage = (lists: z.infer<typeof ProviderUserListSchema>[]) => {
            for (const list of lists) {
                userLists.push({
                    id: String(list.id),
                    list_id: list.id,
                    name: list.name,
                    ...(list.description != null && { description: list.description }),
                    ...(list.public != null && { public: list.public }),
                    ...(list.date_added != null && { date_added: list.date_added }),
                    ...(list.date_changed != null && { date_changed: list.date_changed }),
                    ...(list.resource_url != null && { resource_url: list.resource_url })
                });
            }
        };

        processListsPage(firstPage.lists);

        const totalPages = firstPage.pagination.pages;
        for (let page = 2; page <= totalPages; page++) {
            const response = await nango.get({
                endpoint: `/users/${encodeURIComponent(username)}/lists`,
                params: { page, per_page: perPage },
                retries: 3
            });
            const parsed = ProviderListsPageSchema.parse(response.data);
            processListsPage(parsed.lists);
        }

        if (userLists.length > 0) {
            await nango.batchSave(userLists, 'UserList');
        }

        for (const list of userLists) {
            // https://www.discogs.com/developers#page:user-lists,header-user-lists-list
            // This endpoint is not paginated: it returns every item in the list at once.
            const response = await nango.get({
                endpoint: `/lists/${list.list_id}`,
                retries: 3
            });

            const { items } = ProviderListDetailSchema.parse(response.data);
            const records = items.map((item, index) => ({
                id: `${list.list_id}-${item.type}-${item.id}`,
                list_id: list.list_id,
                item_id: item.id,
                type: item.type,
                ...(item.type === 'release' && { release_id: item.id }),
                position: index + 1,
                ...(item.display_title != null && { display_title: item.display_title }),
                ...(item.comment != null && { comment: item.comment }),
                ...(item.uri != null && { uri: item.uri }),
                ...(item.resource_url != null && { resource_url: item.resource_url }),
                ...(item.image_url != null && { image_url: item.image_url })
            }));

            if (records.length > 0) {
                await nango.batchSave(records, 'ListItem');
            }
        }
        await nango.trackDeletesEnd('UserList');
        await nango.trackDeletesEnd('ListItem');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
