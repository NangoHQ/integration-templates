import { z } from 'zod';
import { createAction } from 'nango';

const ProjectFinanceSchema = z
    .object({
        plannedCost: z.number().optional().describe('Planned project cost.'),
        plannedFees: z.number().optional().describe('Planned project fees.'),
        currency: z.string().optional().describe('Currency code for the finance values.'),
        actualFees: z.number().optional().describe('Actual project fees.'),
        actualCost: z.number().optional().describe('Actual project cost.'),
        budget: z.number().optional().describe('Project budget.')
    })
    .passthrough()
    .describe('Project finance and budget values.');

const ProjectSchema = z
    .object({
        authorId: z.string().optional().describe('User ID of the project author.'),
        ownerIds: z.array(z.string()).optional().describe('User IDs of the project owners.'),
        customStatusId: z.string().optional().describe('Custom status ID assigned to the project.'),
        createdDate: z.string().optional().describe('Project creation timestamp (ISO 8601, UTC).'),
        startDate: z.string().optional().describe('Project start date (yyyy-MM-dd).'),
        endDate: z.string().optional().describe('Project end date (yyyy-MM-dd).'),
        completedDate: z.string().optional().describe('Project completion timestamp (ISO 8601, UTC).'),
        status: z.string().optional().describe('Project status, e.g. "Green" or "Completed".'),
        contractType: z.string().optional().describe('Contract type: "Billable" or "NonBillable".'),
        finance: ProjectFinanceSchema.optional().describe('Project finance and budget values, when available.')
    })
    .passthrough()
    .describe('Project-specific attributes. Present only when the folder is a Project.');

const FolderSchema = z
    .object({
        id: z.string().describe('Opaque folder ID. Example: "MQAAAAEQ_HoD".'),
        title: z.string().describe('Folder or project title.'),
        scope: z.string().optional().describe('Folder scope: "WsFolder"/"WsRoot" for active items, "RbFolder"/"RbRoot" for Recycle Bin items.'),
        childIds: z.array(z.string()).optional().describe('IDs of the direct child folders.'),
        parentIds: z.array(z.string()).optional().describe('IDs of the parent folders (returned in the flat "folders" listing).'),
        accountId: z.string().optional().describe('ID of the account that owns the folder.'),
        createdDate: z.string().optional().describe('Creation timestamp (ISO 8601, UTC).'),
        updatedDate: z.string().optional().describe('Last update timestamp (ISO 8601, UTC).'),
        description: z.string().optional().describe('Folder description; may be an empty string.'),
        sharedIds: z.array(z.string()).optional().describe('User and group IDs the folder is shared with.'),
        permalink: z.string().optional().describe('Human-facing Wrike URL for the folder.'),
        workflowId: z.string().optional().describe('ID of the workflow applied to the folder.'),
        color: z.string().optional().describe('Folder color name.'),
        customItemTypeId: z.string().optional().describe('Custom item type ID; absent for standard folders and projects.'),
        space: z.boolean().optional().describe('True when the folder is a Space (the root of a workspace tree).'),
        project: ProjectSchema.optional().describe('Project attributes; present when the folder is a Project and absent for plain folders.')
    })
    .passthrough()
    .describe('A Wrike folder or project.');

const InputSchema = z
    .object({
        deleted: z
            .boolean()
            .optional()
            .describe('Set true to list folders from the Recycle Bin instead of active folders. Defaults to false (active folders only).'),
        project: z.boolean().optional().describe('Filter to only projects (true) or only plain folders (false).'),
        title: z.string().min(1).optional().describe('Case-insensitive substring match on the folder title.'),
        pageSize: z.number().int().positive().max(1000).optional().describe('Number of folders per page (max 1000). Requires a project or title filter.'),
        cursor: z.string().optional().describe('Pagination token from a previous response (nextCursor). Requires a project or title filter.')
    })
    .describe('Filters for listing the account folders and projects.');

const ProviderResponseSchema = z
    .object({
        kind: z.string(),
        data: z.array(FolderSchema),
        nextPageToken: z.string().optional()
    })
    .passthrough();

const OutputSchema = z
    .object({
        kind: z.string().describe('Response shape: "folderTree" for the default tree listing, "folders" for a flat filtered listing.'),
        folders: z.array(FolderSchema).describe('Folders and projects returned by the account.'),
        nextCursor: z.string().optional().describe('Token to pass as `cursor` to fetch the next page; omitted when there are no more results.')
    })
    .describe('Folders and projects returned by the account, plus the response shape and next-page token.');

/**
 * @tags: [read]
 * @tagReason: Reads the account's folders and projects without modifying any provider state.
 * @pitfalls: By default this returns the full folder tree including the account root and Spaces, and providing a `project` or `title` filter switches the result to a flat listing (`kind: "folders"`). Plain folders omit the `project` key while Projects include it. Recycle Bin folders are excluded by default; set `deleted: true` to list them instead. Pagination (`pageSize`/`cursor`) requires a `project` or `title` filter and errors without one.
 */
const action = createAction({
    description: 'List folders in the account, including Projects (Projects are Folders with a `project` sub-object attached, not a separate resource).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const usingPagination = input.pageSize !== undefined || input.cursor !== undefined;
        const usingFilter = input.project !== undefined || input.title !== undefined;

        if (usingPagination && !usingFilter) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'pageSize and cursor require a project or title filter because Wrike only paginates its flat, filtered "folders" listing.'
            });
        }

        const params: Record<string, string | number> = {
            deleted: String(input.deleted ?? false)
        };

        if (input.project !== undefined) {
            params['project'] = String(input.project);
        }
        if (input.title !== undefined) {
            params['title'] = input.title;
        }
        if (input.pageSize !== undefined) {
            params['pageSize'] = input.pageSize;
        }
        if (input.cursor !== undefined) {
            params['nextPageToken'] = input.cursor;
        }

        const response = await nango.get({
            // https://developers.wrike.com/reference/getfoldersempty
            endpoint: '/folders',
            params,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            kind: parsed.kind,
            folders: parsed.data,
            ...(parsed.nextPageToken != null && { nextCursor: parsed.nextPageToken })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
