import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Opportunity ID. Example: "oppo_123"')
});

const ContactEmailSchema = z.object({
    email: z.string().optional(),
    type: z.string().optional()
});

const ContactPhoneSchema = z.object({
    phone: z.string().optional(),
    type: z.string().optional()
});

const RenderedIntegrationLinkSchema = z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    url: z.string().optional()
});

const AttachmentSchema = z.object({
    content_type: z.string(),
    filename: z.string(),
    size: z.number().nullable(),
    thumbnail_url: z.string().nullable().optional(),
    url: z.string()
});

const ProviderOpportunitySchema = z.object({
    id: z.string(),
    lead_id: z.string(),
    contact_id: z.string().nullable(),
    status_id: z.string(),
    status_label: z.string(),
    status_type: z.string(),
    status_display_name: z.string().optional(),
    user_id: z.string(),
    user_name: z.string().nullable().optional(),
    value: z.number().nullable(),
    value_period: z.string(),
    value_currency: z.string().nullable().optional(),
    value_formatted: z.string().nullable().optional(),
    annualized_value: z.number().nullable(),
    annualized_expected_value: z.number().nullable(),
    confidence: z.number(),
    expected_value: z.number().nullable(),
    note: z.string().nullable().optional(),
    pipeline_id: z.string().nullable().optional(),
    pipeline_name: z.string().nullable().optional(),
    lead_name: z.string().nullable().optional(),
    date_created: z.string(),
    date_updated: z.string(),
    date_won: z.string().nullable().optional(),
    date_lost: z.string().nullable().optional(),
    created_by: z.string().nullable().optional(),
    created_by_name: z.string().nullable().optional(),
    updated_by: z.string().nullable().optional(),
    updated_by_name: z.string().nullable().optional(),
    organization_id: z.string(),
    is_stalled: z.boolean().optional(),
    lead_primary_email: ContactEmailSchema.nullable().optional(),
    lead_primary_phone: z.array(ContactPhoneSchema).nullable().optional(),
    integration_links: z.array(RenderedIntegrationLinkSchema).optional(),
    attachments: z.array(AttachmentSchema).optional(),
    stall_status: z.record(z.string(), z.unknown()).nullable().optional(),
    suggested_action: z.record(z.string(), z.unknown()).nullable().optional(),
    comment_summary: z.record(z.string(), z.unknown()).nullable().optional()
});

const OutputSchema = ProviderOpportunitySchema;

const action = createAction({
    description: 'Retrieve a single opportunity by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.close.com/api/resources/opportunities/get
            endpoint: `/v1/opportunity/${encodeURIComponent(input.id)}/`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Opportunity not found',
                id: input.id
            });
        }

        const providerOpportunity = ProviderOpportunitySchema.parse(response.data);

        return providerOpportunity;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
