import { createAction } from 'nango';
import { z } from 'zod';

import { getWorkspaceApiBase } from '../utils/workspace-api-path.js';

const ClarifyListAttributes = z.object({
    _id: z.string(),
    entity: z.string(),
    title: z.string(),
    emoji: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    type: z.string().optional(),
    state: z.string().optional(),
    _created_at: z.string().optional(),
    _updated_at: z.string().optional()
});

const ClarifyListResource = z.object({
    type: z.string(),
    id: z.string(),
    attributes: ClarifyListAttributes
});

const ClarifyPaginationMetaApi = z.object({
    total_records: z.number(),
    total_pages: z.number(),
    offset: z.number(),
    limit: z.number()
});

const ClarifyPaginatedLists = z.object({
    links: z
        .object({
            next: z.string().nullable().optional(),
            prev: z.string().nullable().optional()
        })
        .optional(),
    meta: ClarifyPaginationMetaApi,
    data: z.array(ClarifyListResource)
});

const ClarifyList = z.object({
    id: z.string(),
    title: z.string(),
    entity: z.string(),
    emoji: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    type: z.string().optional(),
    state: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

const ClarifyPaginationMeta = z.object({
    totalRecords: z.number(),
    totalPages: z.number(),
    offset: z.number(),
    limit: z.number()
});

const ListListsInput = z.object({
    limit: z.number().int().positive().max(1000).optional().describe('Page size (default 50 on the Clarify API).'),
    offset: z.number().int().min(0).optional().describe('Records to skip before this page.'),
    entity: z.string().optional().describe('Filter lists by object type (e.g. person, company, deal).'),
    listType: z
        .enum(['static', 'dynamic', 'all'])
        .optional()
        .default('all')
        .describe('Which list types to return. Clarify excludes dynamic lists unless filter[type] is set; default all fetches static and dynamic.')
});

const ListListsOutput = z.object({
    lists: z.array(ClarifyList),
    meta: ClarifyPaginationMeta,
    nextOffset: z.number().optional().describe('Pass as offset to fetch the next page, if more results exist.')
});

function buildParams(input: z.infer<typeof ListListsInput>, listType: 'static' | 'dynamic'): Record<string, string> {
    const params: Record<string, string> = {
        'filter[type]': listType
    };

    if (input.limit !== undefined) {
        params['page[limit]'] = String(input.limit);
    }
    if (input.offset !== undefined) {
        params['page[offset]'] = String(input.offset);
    }
    if (input.entity !== undefined) {
        params['filter[entity]'] = input.entity;
    }

    return params;
}

function toList(resource: z.infer<typeof ClarifyListResource>): z.infer<typeof ClarifyList> {
    const { attributes } = resource;

    return {
        id: resource.id,
        title: attributes.title,
        entity: attributes.entity,
        emoji: attributes.emoji ?? null,
        description: attributes.description ?? null,
        type: attributes.type,
        state: attributes.state,
        createdAt: attributes._created_at,
        updatedAt: attributes._updated_at
    };
}

function hasNextPage(meta: z.infer<typeof ClarifyPaginationMetaApi>): boolean {
    return meta.offset + meta.limit < meta.total_records;
}

const action = createAction({
    description: 'List Clarify workspace lists across all object types.',
    version: '1.0.3',
    input: ListListsInput,
    output: ListListsOutput,

    exec: async (nango, input): Promise<z.infer<typeof ListListsOutput>> => {
        // https://developer.clarify.ai/docs/api-reference/lists/getWorkspaceLists
        const workspaceBase = await getWorkspaceApiBase(nango);
        const listTypeMode = input.listType ?? 'all';
        const typesToFetch: Array<'static' | 'dynamic'> = listTypeMode === 'all' ? ['static', 'dynamic'] : [listTypeMode];

        const listsById = new Map<string, z.infer<typeof ClarifyList>>();
        const pageMetas: Array<z.infer<typeof ClarifyPaginationMetaApi>> = [];

        for (const listType of typesToFetch) {
            const response = await nango.get({
                endpoint: `${workspaceBase}/lists`,
                params: buildParams(input, listType),
                retries: 3
            });

            const parsed = ClarifyPaginatedLists.safeParse(response.data);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Unexpected response from the Clarify lists API.',
                    details: parsed.error.issues
                });
            }

            for (const resource of parsed.data.data) {
                listsById.set(resource.id, toList(resource));
            }

            pageMetas.push(parsed.data.meta);
        }

        const lists = [...listsById.values()];
        const limit = pageMetas[0]?.limit ?? input.limit ?? 50;
        const offset = pageMetas[0]?.offset ?? input.offset ?? 0;
        const totalRecords = pageMetas.reduce((sum, meta) => sum + meta.total_records, 0);
        const anyTypeHasNextPage = pageMetas.some(hasNextPage);

        const meta: z.infer<typeof ClarifyPaginationMeta> = {
            totalRecords,
            totalPages: limit > 0 ? Math.ceil(totalRecords / limit) : 0,
            offset,
            limit
        };

        return {
            lists,
            meta,
            ...(anyTypeHasNextPage && { nextOffset: offset + limit })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
