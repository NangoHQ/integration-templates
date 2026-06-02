import { z } from 'zod';
import { createAction } from 'nango';

const NameSchema = z.object({
    givenName: z.string().optional(),
    familyName: z.string().optional(),
    formatted: z.string().optional()
});

const EmailSchema = z.object({
    value: z.string(),
    type: z.string().optional(),
    primary: z.boolean().optional()
});

const InputSchema = z.object({
    userName: z.string().describe('User login name, typically an email. Example: "bjensen@example.com"'),
    externalId: z.string().optional().describe('Identifier from the provisioning client. Example: "bjensen"'),
    name: NameSchema.optional(),
    displayName: z.string().optional(),
    emails: z.array(EmailSchema).optional(),
    active: z.boolean().optional().describe('Whether the user is active.')
});

const ProviderNameSchema = z.looseObject({
    formatted: z.string().optional(),
    familyName: z.string().optional(),
    givenName: z.string().optional()
});

const ProviderEmailSchema = z.looseObject({
    value: z.string(),
    type: z.string().optional(),
    primary: z.boolean().optional()
});

const ProviderMetaSchema = z.looseObject({
    resourceType: z.string().optional(),
    created: z.string().optional(),
    lastModified: z.string().optional(),
    location: z.string().optional()
});

const ProviderUserSchema = z.looseObject({
    schemas: z.array(z.string()),
    id: z.string(),
    externalId: z.string().optional(),
    userName: z.string(),
    name: ProviderNameSchema.optional(),
    displayName: z.string().optional(),
    emails: z.array(ProviderEmailSchema).optional(),
    active: z.boolean().optional(),
    meta: ProviderMetaSchema.optional()
});

const OutputSchema = z.object({
    id: z.string(),
    userName: z.string(),
    externalId: z.string().optional(),
    displayName: z.string().optional(),
    name: z
        .object({
            givenName: z.string().optional(),
            familyName: z.string().optional(),
            formatted: z.string().optional()
        })
        .optional(),
    emails: z
        .array(
            z.object({
                value: z.string(),
                type: z.string().optional(),
                primary: z.boolean().optional()
            })
        )
        .optional(),
    active: z.boolean().optional(),
    meta: z
        .object({
            resourceType: z.string().optional(),
            created: z.string().optional(),
            lastModified: z.string().optional(),
            location: z.string().optional()
        })
        .optional()
});

const action = createAction({
    description: 'Create a SCIM user in 1Password SCIM.',
    version: '1.1.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-scim-user',
        group: 'Users'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: Record<string, unknown> = {
            schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
            userName: input.userName,
            ...(input.externalId !== undefined && { externalId: input.externalId }),
            ...(input.name !== undefined && { name: input.name }),
            ...(input.displayName !== undefined && { displayName: input.displayName }),
            ...(input.emails !== undefined && { emails: input.emails }),
            ...(input.active !== undefined && { active: input.active })
        };

        const response = await nango.post({
            // https://support.1password.com/scim-endpoints/
            // https://datatracker.ietf.org/doc/html/rfc7644#section-3.3
            endpoint: '/Users',
            data: requestBody,
            retries: 3
        });

        const providerUser = ProviderUserSchema.parse(response.data);

        return {
            id: providerUser.id,
            userName: providerUser.userName,
            ...(providerUser.externalId !== undefined && { externalId: providerUser.externalId }),
            ...(providerUser.displayName !== undefined && { displayName: providerUser.displayName }),
            ...(providerUser.name !== undefined && {
                name: {
                    ...(providerUser.name.givenName !== undefined && { givenName: providerUser.name.givenName }),
                    ...(providerUser.name.familyName !== undefined && { familyName: providerUser.name.familyName }),
                    ...(providerUser.name.formatted !== undefined && { formatted: providerUser.name.formatted })
                }
            }),
            ...(providerUser.emails !== undefined && {
                emails: providerUser.emails.map((email) => ({
                    value: email.value,
                    ...(email.type !== undefined && { type: email.type }),
                    ...(email.primary !== undefined && { primary: email.primary })
                }))
            }),
            ...(providerUser.active !== undefined && { active: providerUser.active }),
            ...(providerUser.meta !== undefined && {
                meta: {
                    ...(providerUser.meta.resourceType !== undefined && { resourceType: providerUser.meta.resourceType }),
                    ...(providerUser.meta.created !== undefined && { created: providerUser.meta.created }),
                    ...(providerUser.meta.lastModified !== undefined && { lastModified: providerUser.meta.lastModified }),
                    ...(providerUser.meta.location !== undefined && { location: providerUser.meta.location })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
