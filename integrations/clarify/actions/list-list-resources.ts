import { createAction } from 'nango';
import { z } from 'zod';

import { getWorkspaceApiBase } from '../utils/workspace-api-path.js';

const ClarifyRecordResource = z.object({
    type: z.string(),
    id: z.string(),
    attributes: z.record(z.string(), z.unknown())
});

const ClarifyPaginationMetaApi = z.object({
    total_records: z.number(),
    total_pages: z.number(),
    offset: z.number(),
    limit: z.number()
});

const ClarifyPaginatedRecords = z.object({
    links: z
        .object({
            next: z.string().nullable().optional(),
            prev: z.string().nullable().optional()
        })
        .optional(),
    meta: ClarifyPaginationMetaApi,
    data: z.array(ClarifyRecordResource)
});

const ClarifyResource = z.object({
    id: z.string(),
    type: z.string(),
    attributes: z.record(z.string(), z.unknown())
});

const ClarifyPaginationMeta = z.object({
    totalRecords: z.number(),
    totalPages: z.number(),
    offset: z.number(),
    limit: z.number()
});

const ListListResourcesInput = z.object({
    object: z.string().describe('Object type (person, company, deal, or a custom c_* object).'),
    listId: z.string().describe('Unique ID of the list.'),
    limit: z.number().int().positive().max(1000).optional().describe('Page size (default 50 on the Clarify API).'),
    offset: z.number().int().min(0).optional().describe('Records to skip before this page.')
});

const ListListResourcesOutput = z.object({
    resources: z.array(ClarifyResource),
    meta: ClarifyPaginationMeta,
    nextOffset: z.number().optional().describe('Pass as offset to fetch the next page, if more results exist.')
});

const action = createAction({
    description: 'List records that belong to a Clarify list.',
    version: '1.0.2',
    input: ListListResourcesInput,
    output: ListListResourcesOutput,

    exec: async (nango, input): Promise<z.infer<typeof ListListResourcesOutput>> => {
        // https://developer.clarify.ai/docs/api-reference/resources/getListResources
        const params: Record<string, string> = {};

        if (input.limit !== undefined) {
            params['page[limit]'] = String(input.limit);
        }
        if (input.offset !== undefined) {
            params['page[offset]'] = String(input.offset);
        }

        const workspaceBase = await getWorkspaceApiBase(nango);
        const response = await nango.get({
            endpoint: `${workspaceBase}/objects/${encodeURIComponent(input.object)}/lists/${encodeURIComponent(input.listId)}/resources`,
            params,
            retries: 3
        });

        const parsed = ClarifyPaginatedRecords.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from the Clarify list resources API.',
                details: parsed.error.issues
            });
        }

        const meta: z.infer<typeof ClarifyPaginationMeta> = {
            totalRecords: parsed.data.meta.total_records,
            totalPages: parsed.data.meta.total_pages,
            offset: parsed.data.meta.offset,
            limit: parsed.data.meta.limit
        };
        const resources = parsed.data.data.map((resource) => ({
            id: resource.id,
            type: resource.type,
            attributes: resource.attributes
        }));
        const nextOffset = meta.offset + meta.limit < meta.totalRecords ? meta.offset + meta.limit : undefined;

        return {
            resources,
            meta,
            ...(nextOffset !== undefined && { nextOffset })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
