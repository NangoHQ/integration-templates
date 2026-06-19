import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.string().describe('PostHog project ID. Example: "309484"'),
    id: z.string().describe('Property definition ID (UUID). Example: "497f6eca-6276-4993-bfeb-53cbbbba6f08"')
});

const UserSchema = z.object({
    id: z.number(),
    uuid: z.string(),
    distinct_id: z.string(),
    first_name: z.string(),
    last_name: z.string(),
    email: z.string(),
    is_email_verified: z.boolean(),
    hedgehog_config: z.record(z.string(), z.unknown()),
    role_at_organization: z.string()
});

const ProviderPropertyDefinitionSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    tags: z.array(z.string()).nullable().optional(),
    is_numerical: z.boolean().nullable().optional(),
    updated_at: z.string().nullable().optional(),
    updated_by: UserSchema.nullable().optional(),
    is_seen_on_filtered_events: z.boolean().nullable().optional(),
    property_type: z.string().nullable().optional(),
    verified: z.boolean().nullable().optional(),
    verified_at: z.string().nullable().optional(),
    verified_by: UserSchema.nullable().optional(),
    hidden: z.boolean().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
    is_numerical: z.boolean().optional(),
    updated_at: z.string().optional(),
    updated_by: UserSchema.optional(),
    is_seen_on_filtered_events: z.boolean().optional(),
    property_type: z.string().optional(),
    verified: z.boolean().optional(),
    verified_at: z.string().optional(),
    verified_by: UserSchema.optional(),
    hidden: z.boolean().optional()
});

const action = createAction({
    description: 'Retrieve a single property definition from PostHog.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['property_definition:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://posthog.com/docs/api/property-definitions
        const response = await nango.get({
            endpoint: `/api/projects/${encodeURIComponent(input.project_id)}/property_definitions/${encodeURIComponent(input.id)}/`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Property definition not found',
                project_id: input.project_id,
                id: input.id
            });
        }

        const providerPropertyDefinition = ProviderPropertyDefinitionSchema.parse(response.data);

        return {
            id: providerPropertyDefinition.id,
            name: providerPropertyDefinition.name,
            ...(providerPropertyDefinition.description !== undefined &&
                providerPropertyDefinition.description !== null && {
                    description: providerPropertyDefinition.description
                }),
            ...(providerPropertyDefinition.tags !== undefined &&
                providerPropertyDefinition.tags !== null && {
                    tags: providerPropertyDefinition.tags
                }),
            ...(providerPropertyDefinition.is_numerical !== undefined &&
                providerPropertyDefinition.is_numerical !== null && {
                    is_numerical: providerPropertyDefinition.is_numerical
                }),
            ...(providerPropertyDefinition.updated_at !== undefined &&
                providerPropertyDefinition.updated_at !== null && {
                    updated_at: providerPropertyDefinition.updated_at
                }),
            ...(providerPropertyDefinition.updated_by !== undefined &&
                providerPropertyDefinition.updated_by !== null && {
                    updated_by: providerPropertyDefinition.updated_by
                }),
            ...(providerPropertyDefinition.is_seen_on_filtered_events !== undefined &&
                providerPropertyDefinition.is_seen_on_filtered_events !== null && {
                    is_seen_on_filtered_events: providerPropertyDefinition.is_seen_on_filtered_events
                }),
            ...(providerPropertyDefinition.property_type !== undefined &&
                providerPropertyDefinition.property_type !== null && {
                    property_type: providerPropertyDefinition.property_type
                }),
            ...(providerPropertyDefinition.verified !== undefined &&
                providerPropertyDefinition.verified !== null && {
                    verified: providerPropertyDefinition.verified
                }),
            ...(providerPropertyDefinition.verified_at !== undefined &&
                providerPropertyDefinition.verified_at !== null && {
                    verified_at: providerPropertyDefinition.verified_at
                }),
            ...(providerPropertyDefinition.verified_by !== undefined &&
                providerPropertyDefinition.verified_by !== null && {
                    verified_by: providerPropertyDefinition.verified_by
                }),
            ...(providerPropertyDefinition.hidden !== undefined &&
                providerPropertyDefinition.hidden !== null && {
                    hidden: providerPropertyDefinition.hidden
                })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
