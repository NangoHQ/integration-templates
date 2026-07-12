import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        ad_account_id: z.string().describe('Pinterest ad account ID. Example: "549770573673"'),
        audience_id: z.string().describe('Audience ID. Example: "2542623499736"'),
        name: z.string().optional().describe('Audience name'),
        description: z.string().optional().describe('Audience description'),
        rule: z.record(z.string(), z.unknown()).optional().describe('Audience rule object, e.g. { visitor_source_id: "2612511566392", retention_days: 180 }'),
        status: z.string().optional().describe('Audience status, e.g. "ACTIVE" or "ARCHIVED". ARCHIVED is the only way to delete an audience.')
    })
    .refine((input) => input.name !== undefined || input.description !== undefined || input.rule !== undefined || input.status !== undefined, {
        message: 'At least one of name, description, rule, or status must be provided.'
    });

const RuleSchema = z
    .object({
        visitor_source_id: z.string().optional(),
        retention_days: z.number().optional(),
        event_source: z.record(z.string(), z.unknown()).optional(),
        filter: z.record(z.string(), z.unknown()).optional()
    })
    .passthrough();

const ProviderAudienceSchema = z
    .object({
        id: z.string(),
        ad_account_id: z.string().optional(),
        name: z.string().optional(),
        description: z.string().optional(),
        audience_type: z.string().optional(),
        status: z.string().optional(),
        size: z.number().optional(),
        rule: RuleSchema.optional(),
        created_at: z.number().optional(),
        updated_at: z.number().optional(),
        type: z.string().optional(),
        is_creator: z.boolean().optional(),
        is_initialized: z.boolean().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    ad_account_id: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    audience_type: z.string().optional(),
    status: z.string().optional(),
    size: z.number().optional(),
    rule: RuleSchema.optional(),
    created_at: z.number().optional(),
    updated_at: z.number().optional(),
    type: z.string().optional(),
    is_creator: z.boolean().optional(),
    is_initialized: z.boolean().optional()
});

const action = createAction({
    description: 'Update an audience (e.g. rename or archive it).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads:read', 'ads:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, unknown> = {};
        if (input.name !== undefined) {
            data['name'] = input.name;
        }
        if (input.description !== undefined) {
            data['description'] = input.description;
        }
        if (input.rule !== undefined) {
            data['rule'] = input.rule;
        }
        if (input.status !== undefined) {
            data['status'] = input.status;
        }

        const response = await nango.patch({
            // https://developers.pinterest.com/docs/api/v5/#operation/audiences/update
            endpoint: `/v5/ad_accounts/${encodeURIComponent(input.ad_account_id)}/audiences/${encodeURIComponent(input.audience_id)}`,
            data: data,
            retries: 1
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Pinterest API returned an empty or invalid response.'
            });
        }

        const providerAudience = ProviderAudienceSchema.parse(response.data);

        return {
            id: providerAudience.id,
            ...(providerAudience.ad_account_id !== undefined && { ad_account_id: providerAudience.ad_account_id }),
            ...(providerAudience.name !== undefined && { name: providerAudience.name }),
            ...(providerAudience.description !== undefined && { description: providerAudience.description }),
            ...(providerAudience.audience_type !== undefined && { audience_type: providerAudience.audience_type }),
            ...(providerAudience.status !== undefined && { status: providerAudience.status }),
            ...(providerAudience.size !== undefined && { size: providerAudience.size }),
            ...(providerAudience.rule !== undefined && { rule: providerAudience.rule }),
            ...(providerAudience.created_at !== undefined && { created_at: providerAudience.created_at }),
            ...(providerAudience.updated_at !== undefined && { updated_at: providerAudience.updated_at }),
            ...(providerAudience.type !== undefined && { type: providerAudience.type }),
            ...(providerAudience.is_creator !== undefined && { is_creator: providerAudience.is_creator }),
            ...(providerAudience.is_initialized !== undefined && { is_initialized: providerAudience.is_initialized })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
