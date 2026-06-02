import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The SCIM group ID. Example: "2819c223-7f76-453a-919d-413861904646"')
});

const ProviderMemberSchema = z.object({
    value: z.string(),
    $ref: z.string().optional(),
    display: z.string().optional()
});

const ProviderMetaSchema = z.object({
    resourceType: z.string().optional(),
    created: z.string().optional(),
    lastModified: z.string().optional(),
    location: z.string().optional(),
    version: z.string().optional()
});

const ProviderGroupSchema = z.object({
    schemas: z.array(z.string()),
    id: z.string(),
    externalId: z.string().optional(),
    meta: ProviderMetaSchema.optional(),
    displayName: z.string(),
    members: z.array(ProviderMemberSchema).optional()
});

const OutputSchema = z.object({
    schemas: z.array(z.string()),
    id: z.string(),
    externalId: z.string().optional(),
    meta: z
        .object({
            resourceType: z.string().optional(),
            created: z.string().optional(),
            lastModified: z.string().optional(),
            location: z.string().optional(),
            version: z.string().optional()
        })
        .optional(),
    displayName: z.string(),
    members: z
        .array(
            z.object({
                value: z.string(),
                $ref: z.string().optional(),
                display: z.string().optional()
            })
        )
        .optional()
});

const action = createAction({
    description: 'Retrieve a single SCIM group from 1Password SCIM.',
    version: '1.1.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-scim-group',
        group: 'Groups'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://support.1password.com/scim-endpoints/
        const response = await nango.get({
            endpoint: `/Groups/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Group not found',
                id: input.id
            });
        }

        const providerGroup = ProviderGroupSchema.parse(response.data);

        return {
            schemas: providerGroup.schemas,
            id: providerGroup.id,
            displayName: providerGroup.displayName,
            ...(providerGroup.externalId !== undefined && { externalId: providerGroup.externalId }),
            ...(providerGroup.meta !== undefined && {
                meta: {
                    ...(providerGroup.meta.resourceType !== undefined && { resourceType: providerGroup.meta.resourceType }),
                    ...(providerGroup.meta.created !== undefined && { created: providerGroup.meta.created }),
                    ...(providerGroup.meta.lastModified !== undefined && { lastModified: providerGroup.meta.lastModified }),
                    ...(providerGroup.meta.location !== undefined && { location: providerGroup.meta.location }),
                    ...(providerGroup.meta.version !== undefined && { version: providerGroup.meta.version })
                }
            }),
            ...(providerGroup.members !== undefined && {
                members: providerGroup.members.map((member) => ({
                    value: member.value,
                    ...(member['$ref'] !== undefined && { $ref: member['$ref'] }),
                    ...(member.display !== undefined && { display: member.display })
                }))
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
