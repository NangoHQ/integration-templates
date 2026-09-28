import { z } from 'zod';
import { createAction } from 'nango';

import { AttributeMapsSchema, ExternalIdSchema, OidcOptionsSchema, SamlOptionsSchema } from '../helpers/schemas.js';

const InputSchema = z
    .object({
        organization_id: z.string(),
        name: z.string().optional(),
        external_id: ExternalIdSchema.optional(),
        connection_type: z.string().optional(),
        attribute_maps: AttributeMapsSchema.optional(),
        saml_options: SamlOptionsSchema.optional(),
        oidc_options: OidcOptionsSchema.optional()
    })
    .refine((input) => Number(input.saml_options !== undefined) + Number(input.oidc_options !== undefined) === 1, {
        message: 'Exactly one of saml_options or oidc_options is required.'
    });
const ResourceSchema = z
    .object({
        object: z.literal('connection'),
        id: z.string(),
        organization_id: z.string().optional(),
        connection_type: z.string(),
        name: z.string(),
        state: z.enum(['requires_type', 'draft', 'active', 'validating', 'inactive', 'deleting']),
        status: z.enum(['linked', 'unlinked']),
        domains: z.array(z.object({ id: z.string(), object: z.literal('connection_domain'), domain: z.string() }).passthrough()),
        created_at: z.string(),
        updated_at: z.string()
    })
    .passthrough();
const OutputSchema = ResourceSchema;

const action = createAction({
    description: 'Create a WorkOS SSO connection.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://workos.com/docs/reference/sso/connection
            endpoint: '/connections',
            data: {
                organization_id: input.organization_id,
                ...(input.name !== undefined && { name: input.name }),
                ...(input.external_id !== undefined && { external_id: input.external_id }),
                ...(input.connection_type !== undefined && { connection_type: input.connection_type }),
                ...(input.attribute_maps !== undefined && { attribute_maps: input.attribute_maps }),
                ...(input.saml_options !== undefined && { saml_options: input.saml_options }),
                ...(input.oidc_options !== undefined && { oidc_options: input.oidc_options })
            },
            retries: 3
        });
        return ResourceSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
