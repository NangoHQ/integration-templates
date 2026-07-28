import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    driveId: z.string().describe('Drive ID containing the Word document. Example: "b!PkCXTGMWc0aQ-tL4aQtFEDRX0SkZPfZDl2tD7OP_gahvi-nd5TAvTJG6KTmx6Mm0"'),
    itemId: z.string().describe('DriveItem ID of the Word document. Example: "01RFYLAYGCHWM67HNJIZBJNCQTFNXT6YGT"'),
    type: z.enum(['view', 'edit', 'embed']).describe('Permission type for the sharing link.'),
    scope: z.enum(['anonymous', 'organization', 'users']).optional().describe('Scope of the sharing link. Omit to use the tenant/site default scope.')
});

const ProviderLinkSchema = z.object({
    id: z.string(),
    roles: z.array(z.string()).optional(),
    link: z
        .object({
            type: z.string().optional(),
            scope: z.string().optional(),
            webUrl: z.string().optional()
        })
        .optional(),
    hasPassword: z.boolean().optional(),
    expirationDateTime: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    webUrl: z.string().optional(),
    type: z.string().optional(),
    scope: z.string().optional(),
    hasPassword: z.boolean().optional(),
    expirationDateTime: z.string().optional()
});

const action = createAction({
    description: 'Create a sharing link for a Word document.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Files.ReadWrite.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/en-us/graph/api/driveitem-createlink
        const response = await nango.post({
            endpoint: `/v1.0/drives/${encodeURIComponent(input.driveId)}/items/${encodeURIComponent(input.itemId)}/createLink`,
            data: {
                type: input.type,
                ...(input.scope !== undefined && { scope: input.scope })
            },
            retries: 3
        });

        const permission = ProviderLinkSchema.parse(response.data);

        return {
            id: permission.id,
            ...(permission.link?.webUrl !== undefined && { webUrl: permission.link.webUrl }),
            ...(permission.link?.type !== undefined && { type: permission.link.type }),
            ...(permission.link?.scope !== undefined && { scope: permission.link.scope }),
            ...(permission.hasPassword !== undefined && { hasPassword: permission.hasPassword }),
            ...(permission.expirationDateTime !== undefined && { expirationDateTime: permission.expirationDateTime })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
