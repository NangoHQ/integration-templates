import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from previous response. Omit for first page.'),
    limit: z.number().optional().describe('Maximum number of shared drives to return. Default is 10, maximum is 100.'),
    query: z.string().optional().describe('Query string for searching shared drives. Example: "hidden = false"')
});

const CapabilitiesSchema = z.object({
    canAddChildren: z.boolean().optional(),
    canChangeCopyRequiresWriterPermissionRestriction: z.boolean().optional(),
    canChangeDomainUsersOnlyRestriction: z.boolean().optional(),
    canChangeDriveBackground: z.boolean().optional(),
    canChangeDriveMembersOnlyRestriction: z.boolean().optional(),
    canComment: z.boolean().optional(),
    canCopy: z.boolean().optional(),
    canDeleteChildren: z.boolean().optional(),
    canDeleteDrive: z.boolean().optional(),
    canDownload: z.boolean().optional(),
    canEdit: z.boolean().optional(),
    canListChildren: z.boolean().optional(),
    canManageMembers: z.boolean().optional(),
    canReadRevisions: z.boolean().optional(),
    canRename: z.boolean().optional(),
    canRenameDrive: z.boolean().optional(),
    canResetDriveRestrictions: z.boolean().optional(),
    canShare: z.boolean().optional(),
    canTrashChildren: z.boolean().optional(),
    canUntrashChildren: z.boolean().optional(),
    canViewItemCounts: z.boolean().optional()
});

const RestrictionsSchema = z.object({
    adminManagedRestrictions: z.boolean().optional(),
    copyRequiresWriterPermission: z.boolean().optional(),
    domainUsersOnly: z.boolean().optional(),
    driveMembersOnly: z.boolean().optional(),
    sharingFoldersRequiresOrganizerPermission: z.boolean().optional()
});

const DriveSchema = z.object({
    id: z.string(),
    name: z.string(),
    colorRgb: z.string().optional(),
    backgroundImageLink: z.string().optional(),
    kind: z.string().optional(),
    hidden: z.boolean().optional(),
    capabilities: CapabilitiesSchema.optional(),
    restrictions: RestrictionsSchema.optional()
});

const OutputSchema = z.object({
    drives: z.array(DriveSchema),
    next_cursor: z.union([z.string(), z.null()]).describe('Pagination cursor for the next page of results. Null if this is the last page.')
});

const action = createAction({
    description: 'List shared drives the user can access, with cursor pagination and drive metadata like hidden, capabilities, and restrictions.',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/actions/list-shared-drives',
        group: 'Drives'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/drive.readonly', 'https://www.googleapis.com/auth/drive'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};

        if (input.cursor) {
            params['pageToken'] = input.cursor;
        }

        if (input.limit !== undefined) {
            params['pageSize'] = input.limit;
        }

        if (input.query) {
            params['q'] = input.query;
        }

        const response = await nango.get({
            // https://developers.google.com/workspace/drive/api/reference/rest/v3/drives/list
            endpoint: '/drive/v3/drives',
            params,
            retries: 3
        });

        if (!response.data || !response.data.drives) {
            return {
                drives: [],
                next_cursor: null
            };
        }

        const drives = response.data.drives.map((drive: any) => ({
            id: drive.id,
            name: drive.name,
            colorRgb: drive.colorRgb,
            backgroundImageLink: drive.backgroundImageLink,
            kind: drive.kind,
            hidden: drive.hidden,
            capabilities: drive.capabilities,
            restrictions: drive.restrictions
        }));

        return {
            drives,
            next_cursor: response.data.nextPageToken || null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
