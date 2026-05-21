import { z } from 'zod';
import { createAction } from 'nango';

const MemberSchema = z.object({
    value: z.string(),
    display: z.string().optional(),
    type: z.string().optional(),
    $ref: z.string().optional()
});

const MetaSchema = z.object({
    resourceType: z.string(),
    created: z.string().optional(),
    lastModified: z.string().optional(),
    location: z.string().optional(),
    version: z.string().optional()
});

const InputSchema = z.object({
    group_id: z.string().describe('The SCIM group ID to patch. Example: "group-123"'),
    operations: z
        .array(
            z.object({
                op: z.enum(['add', 'remove', 'replace']),
                path: z.string().optional(),
                value: z.unknown().optional()
            })
        )
        .describe('SCIM PatchOp operations to apply.')
});

const OutputSchema = z
    .object({
        schemas: z.array(z.string()),
        id: z.string(),
        displayName: z.string().optional(),
        members: z.array(MemberSchema).optional(),
        meta: MetaSchema.optional(),
        externalId: z.string().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Patch attributes or membership for a 1Password SCIM group.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/patch-scim-group',
        group: 'Groups'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.patch({
            // https://support.1password.com/scim-endpoints/
            endpoint: `/Groups/${encodeURIComponent(input.group_id)}`,
            baseUrlOverride: 'https://provisioning.1password.com/scim',
            data: {
                schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
                Operations: input.operations
            },
            retries: 10
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Group not found or patch failed',
                group_id: input.group_id
            });
        }

        const providerGroup = OutputSchema.parse(response.data);

        return providerGroup;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
