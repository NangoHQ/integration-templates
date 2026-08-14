import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const RumApplicationAttributesSchema = z
    .object({
        name: z.string(),
        type: z.string(),
        org_id: z.number(),
        created_at: z.number(),
        updated_at: z.number(),
        created_by_handle: z.string().optional(),
        updated_by_handle: z.string().optional(),
        hash: z.string().optional(),
        client_token: z.string().optional(),
        is_active: z.boolean().optional()
    })
    .passthrough();

const RumApplicationSchema = z.object({
    type: z.string(),
    id: z.string(),
    attributes: RumApplicationAttributesSchema
});

const ProviderResponseSchema = z
    .object({
        data: z.array(RumApplicationSchema)
    })
    .passthrough();

const OutputSchema = z.object({
    applications: z.array(
        z.object({
            id: z.string(),
            type: z.string(),
            name: z.string(),
            application_type: z.string(),
            org_id: z.number(),
            created_at: z.number(),
            updated_at: z.number(),
            created_by_handle: z.string().optional(),
            updated_by_handle: z.string().optional(),
            hash: z.string().optional(),
            client_token: z.string().optional(),
            is_active: z.boolean().optional()
        })
    )
});

const action = createAction({
    description: 'List Real User Monitoring (RUM) applications configured in this account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.datadoghq.com/api/latest/rum/#list-all-rum-applications
            endpoint: 'v2/rum/applications',
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            applications: providerResponse.data.map((app) => ({
                id: app.id,
                type: app.type,
                name: app.attributes.name,
                application_type: app.attributes.type,
                org_id: app.attributes.org_id,
                created_at: app.attributes.created_at,
                updated_at: app.attributes.updated_at,
                ...(app.attributes.created_by_handle !== undefined && { created_by_handle: app.attributes.created_by_handle }),
                ...(app.attributes.updated_by_handle !== undefined && { updated_by_handle: app.attributes.updated_by_handle }),
                ...(app.attributes.hash !== undefined && { hash: app.attributes.hash }),
                ...(app.attributes.client_token !== undefined && { client_token: app.attributes.client_token }),
                ...(app.attributes.is_active !== undefined && { is_active: app.attributes.is_active })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
