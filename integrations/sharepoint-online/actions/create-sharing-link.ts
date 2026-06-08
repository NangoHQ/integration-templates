import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    siteId: z.string().describe('SharePoint site ID. Example: "contoso.sharepoint.com,12345678-1234-1234-1234-123456789012"'),
    driveId: z.string().describe('Drive ID. Example: "b!1234567890abcdefghijklmnopqrstuvwxyz"'),
    itemId: z.string().describe('Drive item ID. Example: "0123456789abcdefghijklmnopqrstuvwxyz"'),
    type: z.enum(['view', 'edit', 'embed']).describe('The type of sharing link to create.'),
    scope: z.enum(['anonymous', 'organization']).describe('The scope of access granted by the sharing link.')
});

const LinkSchema = z.object({
    type: z.string().optional(),
    scope: z.string().optional(),
    webUrl: z.string().optional(),
    preventsDownload: z.boolean().optional()
});

const PermissionSchema = z.object({
    id: z.string().optional(),
    roles: z.array(z.string()).optional(),
    shareId: z.string().optional(),
    hasPassword: z.boolean().optional(),
    link: LinkSchema.optional()
});

const OutputSchema = z.object({
    id: z.string().optional(),
    roles: z.array(z.string()).optional(),
    shareId: z.string().optional(),
    hasPassword: z.boolean().optional(),
    link: z
        .object({
            type: z.string().optional(),
            scope: z.string().optional(),
            webUrl: z.string().optional(),
            preventsDownload: z.boolean().optional()
        })
        .optional()
});

const action = createAction({
    description: 'Create a shareable link for a drive item.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-sharing-link'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Sites.ReadWrite.All', 'Files.ReadWrite.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://learn.microsoft.com/graph/api/driveitem-createlink
            endpoint: `/v1.0/sites/${encodeURIComponent(input.siteId)}/drives/${encodeURIComponent(input.driveId)}/items/${encodeURIComponent(input.itemId)}/createLink`,
            data: {
                type: input.type,
                scope: input.scope
            },
            retries: 3
        });

        const permission = PermissionSchema.parse(response.data);

        return {
            ...(permission.id !== undefined && { id: permission.id }),
            ...(permission.roles !== undefined && { roles: permission.roles }),
            ...(permission.shareId !== undefined && { shareId: permission.shareId }),
            ...(permission.hasPassword !== undefined && { hasPassword: permission.hasPassword }),
            ...(permission.link !== undefined && {
                link: {
                    ...(permission.link.type !== undefined && { type: permission.link.type }),
                    ...(permission.link.scope !== undefined && { scope: permission.link.scope }),
                    ...(permission.link.webUrl !== undefined && { webUrl: permission.link.webUrl }),
                    ...(permission.link.preventsDownload !== undefined && { preventsDownload: permission.link.preventsDownload })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
