import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    file_id: z.string().describe('The ID of the file. Example: "1xABCDEF123456"'),
    permission_id: z.string().describe('The ID of the permission. Example: "12345678901234567890"')
});

const OutputSchema = z.object({
    id: z.string(),
    type: z.string().describe('The type of the grantee. Valid values are user, group, domain, or anyone.'),
    role: z.string().describe('The role granted by this permission. Valid values are owner, organizer, fileOrganizer, writer, commenter, or reader.'),
    email_address: z.union([z.string(), z.null()]).optional().describe('The email address of the user or group this permission refers to.'),
    domain: z.union([z.string(), z.null()]).optional().describe('The domain to which this permission refers.'),
    allow_file_discovery: z.union([z.boolean(), z.null()]).optional().describe('Whether the permission allows the file to be discovered through search.'),
    display_name: z.union([z.string(), z.null()]).optional().describe('A displayable name for users, groups or domains.'),
    photo_link: z.union([z.string(), z.null()]).optional().describe('A link to the profile photo, if available.'),
    expiration_time: z.union([z.string(), z.null()]).optional().describe('The time at which this permission will expire (RFC 3339 date-time).'),
    permission_details: z
        .array(z.object({}).passthrough())
        .optional()
        .describe('Details of the permission, including specific permissions and whether they inherited from a parent.'),
    deleted: z.union([z.boolean(), z.null()]).optional().describe('Whether this permission has been deleted.'),
    pending_owner: z.union([z.boolean(), z.null()]).optional().describe('Whether the account associated with this permission has been deleted.'),
    view: z.union([z.string(), z.null()]).optional().describe('Indicates the view for this permission.'),
    created_time: z.union([z.string(), z.null()]).optional().describe('The time at which this permission was created (RFC 3339 date-time).')
});

const action = createAction({
    description: 'Get a permission by ID',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/actions/get-permission',
        group: 'Permissions'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/workspace/drive/api/reference/rest/v3/permissions/get
        const response = await nango.get({
            endpoint: `/drive/v3/files/${input.file_id}/permissions/${input.permission_id}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Permission not found',
                file_id: input.file_id,
                permission_id: input.permission_id
            });
        }

        const permission = response.data;

        return {
            id: permission.id,
            type: permission.type,
            role: permission.role,
            email_address: permission.emailAddress ?? null,
            domain: permission.domain ?? null,
            allow_file_discovery: permission.allowFileDiscovery ?? null,
            display_name: permission.displayName ?? null,
            photo_link: permission.photoLink ?? null,
            expiration_time: permission.expirationTime ?? null,
            permission_details: permission.permissionDetails ?? undefined,
            deleted: permission.deleted ?? null,
            pending_owner: permission.pendingOwner ?? null,
            view: permission.view ?? null,
            created_time: permission.createdTime ?? null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
