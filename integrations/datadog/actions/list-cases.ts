import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.'),
    page_size: z.number().optional().describe('Number of cases per page. Maximum allowed value is 100.'),
    filter: z.string().optional().describe('Search query filter.'),
    sort_field: z.enum(['created_at', 'priority', 'status']).optional().describe('Field to sort by.'),
    sort_asc: z.boolean().optional().describe('Sort ascending.')
});

const CaseRelationshipDataSchema = z.object({
    id: z.string(),
    type: z.string()
});

const CaseRelationshipsSchema = z.object({
    assignee: z
        .object({
            data: CaseRelationshipDataSchema
        })
        .optional(),
    created_by: z
        .object({
            data: CaseRelationshipDataSchema
        })
        .optional(),
    modified_by: z
        .object({
            data: CaseRelationshipDataSchema
        })
        .optional(),
    project: z
        .object({
            data: CaseRelationshipDataSchema
        })
        .optional()
});

const CaseAttributesSchema = z.object({
    archived_at: z.string().optional(),
    attributes: z.record(z.string(), z.array(z.string())).optional(),
    closed_at: z.string().optional(),
    created_at: z.string().optional(),
    custom_attributes: z.record(z.string(), z.unknown()).optional(),
    description: z.string().optional(),
    jira_issue: z.unknown().optional(),
    key: z.string().optional(),
    modified_at: z.string().optional(),
    priority: z.string().optional(),
    service_now_ticket: z.unknown().optional(),
    status: z.string().optional(),
    status_group: z.string().optional(),
    status_name: z.string().optional(),
    title: z.string().optional(),
    type: z.string().optional(),
    type_id: z.string().optional()
});

const CaseSchema = z.object({
    id: z.string(),
    type: z.string(),
    attributes: CaseAttributesSchema,
    relationships: CaseRelationshipsSchema.optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(CaseSchema),
    meta: z.object({
        page: z.object({
            current: z.number(),
            size: z.number(),
            total: z.number()
        })
    })
});

const CaseOutputSchema = z.object({
    id: z.string(),
    type: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    key: z.string().optional(),
    priority: z.string().optional(),
    status: z.string().optional(),
    status_name: z.string().optional(),
    status_group: z.string().optional(),
    created_at: z.string().optional(),
    modified_at: z.string().optional(),
    archived_at: z.string().optional(),
    closed_at: z.string().optional(),
    type_id: z.string().optional(),
    assignee_id: z.string().optional(),
    created_by_id: z.string().optional(),
    modified_by_id: z.string().optional(),
    project_id: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(CaseOutputSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List or search cases across projects.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['cases_read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const pageNumber = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (Number.isNaN(pageNumber) || pageNumber < 1) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a valid positive integer representing a page number.'
            });
        }

        // https://docs.datadoghq.com/api/latest/case-management/search-cases/
        const response = await nango.get({
            endpoint: 'v2/cases',
            params: {
                ...(input.page_size !== undefined && { 'page[size]': String(input.page_size) }),
                'page[number]': String(pageNumber),
                ...(input.filter !== undefined && { filter: input.filter }),
                ...(input.sort_field !== undefined && { 'sort[field]': input.sort_field }),
                ...(input.sort_asc !== undefined && { 'sort[asc]': String(input.sort_asc) })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const items = providerResponse.data.map((caseItem) => {
            const attrs = caseItem.attributes;
            const rels = caseItem.relationships;
            return {
                id: caseItem.id,
                type: caseItem.type,
                ...(attrs.title !== undefined && { title: attrs.title }),
                ...(attrs.description !== undefined && { description: attrs.description }),
                ...(attrs.key !== undefined && { key: attrs.key }),
                ...(attrs.priority !== undefined && { priority: attrs.priority }),
                ...(attrs.status !== undefined && { status: attrs.status }),
                ...(attrs.status_name !== undefined && { status_name: attrs.status_name }),
                ...(attrs.status_group !== undefined && { status_group: attrs.status_group }),
                ...(attrs.created_at !== undefined && { created_at: attrs.created_at }),
                ...(attrs.modified_at !== undefined && { modified_at: attrs.modified_at }),
                ...(attrs.archived_at !== undefined && { archived_at: attrs.archived_at }),
                ...(attrs.closed_at !== undefined && { closed_at: attrs.closed_at }),
                ...(attrs.type_id !== undefined && { type_id: attrs.type_id }),
                ...(rels?.assignee?.data?.id !== undefined && { assignee_id: rels.assignee.data.id }),
                ...(rels?.created_by?.data?.id !== undefined && { created_by_id: rels.created_by.data.id }),
                ...(rels?.modified_by?.data?.id !== undefined && { modified_by_id: rels.modified_by.data.id }),
                ...(rels?.project?.data?.id !== undefined && { project_id: rels.project.data.id })
            };
        });

        const currentPage = providerResponse.meta.page.current;
        const totalPages = providerResponse.meta.page.total;
        const nextCursor = currentPage < totalPages ? String(currentPage + 1) : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
