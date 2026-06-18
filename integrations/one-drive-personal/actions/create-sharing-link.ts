import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    item_id: z.string().describe('The ID of the drive item (file or folder) to share. Example: "0123456789abc!123"'),
    type: z.enum(['view', 'edit']).describe('The type of sharing link to create. "view" allows read-only access, "edit" allows read-write access.'),
    scope: z
        .enum(['anonymous', 'users'])
        .describe(
            'The scope of the sharing link. "anonymous" allows anyone with the link to access (no sign-in required), "users" restricts to existing organization users.'
        )
});

const IdentitySchema = z.object({
    displayName: z.string().optional(),
    id: z.string().optional(),
    loginHint: z.string().optional(),
    email: z.string().optional()
});

const LinkSchema = z.object({
    type: z.enum(['view', 'edit']).optional(),
    scope: z.enum(['anonymous', 'users', 'organization']).optional(),
    webUrl: z.string().optional(),
    application: z
        .object({
            id: z.string().optional(),
            displayName: z.string().optional()
        })
        .optional(),
    preventsDownload: z.boolean().optional(),
    password: z.string().optional(),
    expirationDateTime: z.string().optional(),
    hasPassword: z.boolean().optional()
});

const PermissionSchema = z.object({
    id: z.string().optional(),
    link: LinkSchema.optional(),
    invitation: z
        .object({
            email: z.string().optional(),
            redeemedBy: z.string().optional(),
            signInRequired: z.boolean().optional()
        })
        .optional(),
    roles: z.array(z.enum(['read', 'write', 'owner'])).optional(),
    shareId: z.string().optional(),
    expirationDateTime: z.string().optional(),
    hasPassword: z.boolean().optional(),
    grantedTo: z.object({ user: IdentitySchema }).optional(),
    grantedToIdentities: z.array(z.object({ user: IdentitySchema })).optional()
});

const OutputSchema = z.object({
    id: z.string().optional().describe('The unique ID of the permission created.'),
    link: z
        .object({
            type: z.enum(['view', 'edit']).optional(),
            scope: z.enum(['anonymous', 'users', 'organization']).optional(),
            webUrl: z.string().optional().describe('The URL that can be used to access the shared item.')
        })
        .optional(),
    share_id: z.string().optional().describe('A unique token for the share link.'),
    roles: z.array(z.string()).optional().describe('The set of roles granted by the permission.')
});

const action = createAction({
    description: 'Create a share link for a file or folder in OneDrive.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['onedrive.readwrite'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/onedrive/developer/rest-api/api/driveitem_createlink
        const response = await nango.post({
            endpoint: `/v1.0/drive/items/${encodeURIComponent(input.item_id)}/action.createLink`,
            data: {
                type: input.type,
                scope: input.scope
            },
            retries: 3
        });

        const permission = PermissionSchema.parse(response.data);

        return {
            id: permission.id,
            link: permission.link
                ? {
                      type: permission.link.type,
                      scope: permission.link.scope,
                      webUrl: permission.link.webUrl
                  }
                : undefined,
            share_id: permission.shareId,
            roles: permission.roles
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
