import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    query: z.string().describe('Full-text search query string. Example: "bug fix authentication"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    first: z.number().int().min(1).max(100).optional().describe('Number of results to return (1-100). Default: 50'),
    filter: z
        .object({
            team_id: z.string().optional().describe('Filter by team ID'),
            state_id: z.string().optional().describe('Filter by workflow state ID'),
            assignee_id: z.string().optional().describe('Filter by assignee user ID'),
            priority: z.number().int().min(0).max(4).optional().describe('Filter by priority (0=No Priority, 1=Urgent, 2=High, 3=Normal, 4=Low)'),
            label_ids: z.array(z.string()).optional().describe('Filter by label IDs'),
            project_id: z.string().optional().describe('Filter by project ID'),
            cycle_id: z.string().optional().describe('Filter by cycle ID'),
            parent_id: z.string().optional().describe('Filter by parent issue ID'),
            include_archived: z.boolean().optional().describe('Include archived issues in results. Default: false')
        })
        .optional()
        .describe('Optional filters to narrow search results')
});

const IssueSchema = z.object({
    id: z.string(),
    identifier: z.string(),
    title: z.string(),
    description: z.union([z.string(), z.null()]),
    priority: z.number().int(),
    state: z.object({
        id: z.string(),
        name: z.string()
    }),
    assignee: z
        .object({
            id: z.string(),
            name: z.string()
        })
        .nullable(),
    team: z.object({
        id: z.string(),
        name: z.string()
    }),
    created_at: z.string(),
    updated_at: z.string(),
    archived_at: z.union([z.string(), z.null()]),
    url: z.string()
});

const OutputSchema = z.object({
    issues: z.array(IssueSchema),
    next_cursor: z.union([z.string(), z.null()]),
    has_more: z.boolean()
});

const action = createAction({
    description: 'Search Linear issues with full-text query support',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/search-issues',
        group: 'Issues'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Build the GraphQL filter from input.filter
        const filter: Record<string, unknown> = {};
        if (input.filter) {
            if (input.filter.team_id) {
                filter['team'] = { id: { eq: input.filter.team_id } };
            }
            if (input.filter.state_id) {
                filter['state'] = { id: { eq: input.filter.state_id } };
            }
            if (input.filter.assignee_id) {
                filter['assignee'] = { id: { eq: input.filter.assignee_id } };
            }
            if (input.filter.priority !== undefined) {
                filter['priority'] = { eq: input.filter.priority };
            }
            if (input.filter.label_ids && input.filter.label_ids.length > 0) {
                filter['labels'] = { id: { in: input.filter.label_ids } };
            }
            if (input.filter.project_id) {
                filter['project'] = { id: { eq: input.filter.project_id } };
            }
            if (input.filter.cycle_id) {
                filter['cycle'] = { id: { eq: input.filter.cycle_id } };
            }
            if (input.filter.parent_id) {
                filter['parent'] = { id: { eq: input.filter.parent_id } };
            }
        }

        const includeArchived = input.filter?.include_archived ?? false;
        const first = input.first ?? 50;

        // https://linear.app/developers/graphql
        const response = await nango.post({
            endpoint: '/graphql',
            data: {
                query: `
                    query SearchIssues($term: String!, $first: Int!, $after: String, $filter: IssueFilter, $includeArchived: Boolean) {
                        searchIssues(
                            term: $term,
                            first: $first,
                            after: $after,
                            filter: $filter,
                            includeArchived: $includeArchived
                        ) {
                            nodes {
                                id
                                identifier
                                title
                                description
                                priority
                                state {
                                    id
                                    name
                                }
                                assignee {
                                    id
                                    name
                                }
                                team {
                                    id
                                    name
                                }
                                createdAt
                                updatedAt
                                archivedAt
                                url
                            }
                            pageInfo {
                                hasNextPage
                                endCursor
                            }
                        }
                    }
                `,
                variables: {
                    term: input.query,
                    first: first,
                    after: input.cursor ?? null,
                    filter: Object.keys(filter).length > 0 ? filter : null,
                    includeArchived: includeArchived
                }
            },
            retries: 3
        });

        const data = response.data.data.searchIssues;

        return {
            issues: data.nodes.map((issue: Record<string, unknown>) => ({
                id: issue['id'],
                identifier: issue['identifier'],
                title: issue['title'],
                description: issue['description'] ?? null,
                priority: issue['priority'],
                state: issue['state'],
                assignee: issue['assignee'] ?? null,
                team: issue['team'],
                created_at: issue['createdAt'],
                updated_at: issue['updatedAt'],
                archived_at: issue['archivedAt'] ?? null,
                url: issue['url']
            })),
            next_cursor: data.pageInfo.endCursor ?? null,
            has_more: data.pageInfo.hasNextPage
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
