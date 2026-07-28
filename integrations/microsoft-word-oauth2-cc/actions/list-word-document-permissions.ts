import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    drive_id: z.string().describe('Drive ID. Example: "b!PkCXTGMWc0aQ-tL4aQtFEDRX0SkZPfZDl2tD7OP_gahvi-nd5TAvTJG6KTmx6Mm0"'),
    item_id: z.string().describe('Item (driveItem) ID. Example: "01RFYLAYGCHWM67HNJIZBJNCQTFNXT6YGT"')
});

const IdentitySchema = z
    .object({
        displayName: z.string().optional(),
        id: z.string().optional(),
        email: z.string().optional()
    })
    .passthrough();

const PermissionSchema = z
    .object({
        id: z.string(),
        roles: z.array(z.string()).optional(),
        link: z
            .object({
                type: z.string().optional(),
                scope: z.string().optional(),
                webUrl: z.string().optional()
            })
            .passthrough()
            .optional(),
        grantedTo: z
            .object({ user: IdentitySchema.optional(), application: IdentitySchema.optional(), device: IdentitySchema.optional() })
            .passthrough()
            .optional(),
        grantedToIdentities: z
            .array(z.object({ user: IdentitySchema.optional(), application: IdentitySchema.optional(), device: IdentitySchema.optional() }).passthrough())
            .optional(),
        invitation: z.object({ email: z.string().optional(), signInRequired: z.boolean().optional() }).passthrough().optional(),
        expirationDateTime: z.string().optional(),
        hasPassword: z.boolean().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    permissions: z.array(PermissionSchema)
});

const action = createAction({
    description: 'List sharing permissions on a Word document.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Files.Read.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/en-us/graph/api/driveitem-list-permissions
        const response = await nango.get({
            endpoint: `/v1.0/drives/${encodeURIComponent(input.drive_id)}/items/${encodeURIComponent(input.item_id)}/permissions`,
            retries: 3
        });

        const raw = response.data;

        if (!raw || typeof raw !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Microsoft Graph permissions endpoint.'
            });
        }

        const value = raw['value'];
        if (!Array.isArray(value)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Expected an array of permissions in response.value.'
            });
        }

        const permissions = value.map((item: unknown) => {
            const parsed = PermissionSchema.safeParse(item);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Failed to parse a permission object.',
                    details: parsed.error.issues
                });
            }
            return parsed.data;
        });

        return { permissions };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
