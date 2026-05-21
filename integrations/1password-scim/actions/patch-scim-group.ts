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
            z.discriminatedUnion('op', [
                z.object({ op: z.literal('add'), path: z.string().optional(), value: z.unknown().optional() }),
                z.object({ op: z.literal('replace'), path: z.string().optional(), value: z.unknown().optional() }),
                z.object({ op: z.literal('remove'), path: z.string(), value: z.unknown().optional() })
            ])
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

        let rawData = response.data;
        if (!rawData) {
            // SCIM PATCH may return 204 No Content on success; fetch current state
            const getResponse = await nango.get({
                baseUrlOverride: 'https://provisioning.1password.com/scim',
                endpoint: `/Groups/${encodeURIComponent(input.group_id)}`,
                retries: 3
            });
            if (!getResponse.data) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'Group not found',
                    group_id: input.group_id
                });
            }
            rawData = getResponse.data;
        }

        const providerGroup = OutputSchema.parse(rawData);

        return providerGroup;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
