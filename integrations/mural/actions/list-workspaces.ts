import { z } from 'zod';
import { createAction } from 'nango';

const SharingSettingsSchema = z.object({
    link: z
        .string()
        .nullable()
        .optional()
        .describe('Invitation link a member with an account can use to access the workspace. Example: "https://app.mural.co/invitation/team/asd6544"')
});

const WorkspaceSchema = z.object({
    id: z.string().describe('Unique identifier of the workspace. Example: "workspace1234"'),
    name: z.string().describe('Display name of the workspace. Example: "My Company\'s Q4 goals"'),
    description: z.string().nullable().optional().describe('Description of the workspace; may be an empty string when unset.'),
    image: z.string().nullable().optional().describe('URL of the workspace avatar image.'),
    createdOn: z
        .number()
        .nullable()
        .optional()
        .describe('Workspace creation time as a raw Unix epoch-milliseconds integer (not an ISO-8601 string). Example: 1608060691000'),
    locked: z.boolean().nullable().optional().describe('Whether the workspace is locked.'),
    suspended: z.boolean().nullable().optional().describe('Whether the workspace has been suspended.'),
    companyId: z.string().nullable().optional().describe('Unique identifier of the company that owns the workspace.'),
    sharingSettings: SharingSettingsSchema.nullable().optional().describe('Sharing settings for the workspace.'),
    trialEnds: z.string().nullable().optional().describe('Date the workspace trial ended, formatted as YYYY-MM-DD.'),
    trialExtended: z.boolean().nullable().optional().describe('Whether the workspace trial has been extended.')
});

const InputSchema = z
    .object({
        limit: z.number().int().positive().max(100).optional().describe('Maximum number of workspaces to return. Omit to use the provider default.'),
        cursor: z.string().min(1).optional().describe('Pagination token from the previous response\'s "next" field. Omit to fetch the first page.')
    })
    .describe('Filters for listing the workspaces accessible to the connection.');

const OutputSchema = z
    .object({
        value: z.array(WorkspaceSchema).describe('Workspaces the authenticated connection can access.'),
        next: z.string().nullable().optional().describe('Token to fetch the next page of workspaces. Absent when all workspaces fit in a single page.')
    })
    .describe('A page of workspaces accessible to the connection.');

/**
 * @tags: [read]
 * @tagReason: Reads the workspaces accessible to the connection without creating, modifying, or deleting any provider state.
 * @pitfalls: createdOn is a raw Unix epoch-milliseconds integer, not an ISO-8601 string; the list includes inactive and suspended workspaces, so filter on suspended/locked when you only want active ones; a "next" token appears only when more than one page of workspaces exists, so its absence is normal.
 */
const action = createAction({
    description: "List the workspaces this connection can access (top-level org units in Mural's object model).",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.mural.co/public/reference/getworkspaces
            endpoint: '/api/public/v1/workspaces',
            params: {
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.cursor !== undefined && { next: input.cursor })
            },
            retries: 3
        });

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
