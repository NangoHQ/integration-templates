import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    query: z.string().optional().describe('Search term used to filter down results. Example: "Project Tracker"'),
    isOwner: z.boolean().optional().describe('Show only docs owned by the user.'),
    isPublished: z.boolean().optional().describe('Show only published docs.'),
    workspaceId: z.string().optional().describe('Show only docs belonging to the given workspace. Example: "ws-oZFDiLKJ45"'),
    folderId: z.string().optional().describe('Show only docs belonging to the given folder.'),
    channelId: z.string().optional().describe('Filter by channel ID.'),
    limit: z.number().optional().describe('Maximum number of results to return. Example: 10'),
    pageToken: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const DocSchema = z
    .object({
        id: z.string(),
        type: z.string(),
        href: z.string(),
        browserLink: z.string(),
        name: z.string(),
        owner: z.string(),
        ownerName: z.string(),
        createdAt: z.string(),
        updatedAt: z.string()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(DocSchema),
    nextPageToken: z.string().optional()
});

const action = createAction({
    description: 'List docs accessible to the authenticated user.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    endpoint: {
        path: '/actions/list-docs',
        method: 'POST'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://coda.io/developers/apis/v1#tag/Docs/operation/listDocs
        const response = await nango.get({
            endpoint: '/docs',
            params: {
                ...(input.query !== undefined && { query: input.query }),
                ...(input.isOwner !== undefined && { isOwner: String(input.isOwner) }),
                ...(input.isPublished !== undefined && { isPublished: String(input.isPublished) }),
                ...(input.workspaceId !== undefined && { workspaceId: input.workspaceId }),
                ...(input.folderId !== undefined && { folderId: input.folderId }),
                ...(input.channelId !== undefined && { channelId: input.channelId }),
                ...(input.limit !== undefined && { limit: String(input.limit) }),
                ...(input.pageToken !== undefined && { pageToken: input.pageToken })
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                items: z.array(z.unknown()),
                nextPageToken: z.string().optional()
            })
            .parse(response.data);

        const items = providerResponse.items.map((item: unknown) => {
            const doc = DocSchema.parse(item);
            return {
                id: doc.id,
                type: doc.type,
                href: doc.href,
                browserLink: doc.browserLink,
                name: doc.name,
                owner: doc.owner,
                ownerName: doc.ownerName,
                createdAt: doc.createdAt,
                updatedAt: doc.updatedAt,
                ...Object.fromEntries(
                    Object.entries(doc).filter(
                        ([key]) => !['id', 'type', 'href', 'browserLink', 'name', 'owner', 'ownerName', 'createdAt', 'updatedAt'].includes(key)
                    )
                )
            };
        });

        return {
            items,
            ...(providerResponse.nextPageToken !== undefined && { nextPageToken: providerResponse.nextPageToken })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
