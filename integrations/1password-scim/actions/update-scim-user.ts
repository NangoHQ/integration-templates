import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('SCIM User ID. Example: "2819c223-7f76-453a-919d-413861904646"'),
    userName: z.string().optional().describe('User email address. Example: "user@example.com"'),
    givenName: z.string().optional().describe('First name. Example: "Jane"'),
    familyName: z.string().optional().describe('Last name. Example: "Doe"'),
    displayName: z.string().optional().describe('Display name. Example: "Jane Doe"'),
    active: z.boolean().optional().describe('Whether the user is active.')
});

const NameSchema = z.object({
    formatted: z.string().optional(),
    familyName: z.string().optional(),
    givenName: z.string().optional()
});

const EmailSchema = z.object({
    value: z.string(),
    type: z.string().optional(),
    primary: z.boolean().optional()
});

const MetaSchema = z.object({
    resourceType: z.string(),
    created: z.string().optional(),
    lastModified: z.string().optional(),
    location: z.string().optional(),
    version: z.string().optional()
});

const ProviderUserSchema = z.object({
    schemas: z.array(z.string()),
    id: z.string(),
    externalId: z.string().optional(),
    meta: MetaSchema.optional(),
    userName: z.string().optional(),
    name: NameSchema.optional(),
    displayName: z.string().optional(),
    active: z.boolean().optional(),
    emails: z.array(EmailSchema).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    userName: z.string().optional(),
    givenName: z.string().optional(),
    familyName: z.string().optional(),
    displayName: z.string().optional(),
    active: z.boolean().optional(),
    emails: z.array(z.object({ value: z.string(), type: z.string().optional(), primary: z.boolean().optional() })).optional()
});

const action = createAction({
    description: 'Update a SCIM user in 1Password SCIM.',
    version: '1.1.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const operations: Array<{ op: 'replace'; path?: string; value: unknown }> = [];

        if (input.userName !== undefined) {
            operations.push({ op: 'replace', path: 'userName', value: input.userName });
        }
        if (input.givenName !== undefined) {
            operations.push({ op: 'replace', path: 'name.givenName', value: input.givenName });
        }
        if (input.familyName !== undefined) {
            operations.push({ op: 'replace', path: 'name.familyName', value: input.familyName });
        }
        if (input.displayName !== undefined) {
            operations.push({ op: 'replace', path: 'displayName', value: input.displayName });
        }
        if (input.active !== undefined) {
            operations.push({ op: 'replace', path: 'active', value: input.active });
        }

        if (operations.length === 0) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'At least one field to update must be provided.'
            });
        }

        // https://support.1password.com/scim-endpoints/
        const response = await nango.patch({
            endpoint: `v2/Users/${encodeURIComponent(input.id)}`,
            data: {
                schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
                Operations: operations
            },
            retries: 3
        });

        let rawData = response.data;
        if (!rawData) {
            // SCIM PATCH may return 204 No Content on success; fetch current state
            const getResponse = await nango.get({
                endpoint: `/Users/${encodeURIComponent(input.id)}`,
                retries: 3
            });
            if (!getResponse.data) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'User not found',
                    id: input.id
                });
            }
            rawData = getResponse.data;
        }

        const providerUser = ProviderUserSchema.parse(rawData);

        return {
            id: providerUser.id,
            ...(providerUser.userName !== undefined && { userName: providerUser.userName }),
            ...(providerUser.name?.givenName !== undefined && { givenName: providerUser.name.givenName }),
            ...(providerUser.name?.familyName !== undefined && { familyName: providerUser.name.familyName }),
            ...(providerUser.displayName !== undefined && { displayName: providerUser.displayName }),
            ...(providerUser.active !== undefined && { active: providerUser.active }),
            ...(providerUser.emails !== undefined && {
                emails: providerUser.emails.map((email) => ({
                    value: email.value,
                    ...(email.type !== undefined && { type: email.type }),
                    ...(email.primary !== undefined && { primary: email.primary })
                }))
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
