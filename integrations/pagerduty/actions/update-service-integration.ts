import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        service_id: z.string().describe('The ID of the service that owns the integration.'),
        integration_id: z.string().describe('The ID of the integration to update.'),
        type: z.string().optional().describe('The integration type. Example: "generic_events_api_inbound_integration".'),
        name: z.string().optional().describe('The name of the integration.'),
        vendor_id: z.string().optional().describe('The ID of the vendor to associate with this integration.'),
        integration_email: z.string().optional().describe('The email address for generic email inbound integrations. Must be @your-subdomain.pagerduty.com.'),
        email_incident_creation: z
            .enum(['on_new_email', 'on_new_email_subject', 'only_if_no_open_incidents', 'use_rules'])
            .optional()
            .describe('How incidents should be created from incoming emails for generic email inbound integrations.'),
        email_filter_mode: z
            .enum(['all-email', 'or-rules-email', 'and-rules-email'])
            .optional()
            .describe('The filter mode for incoming emails for generic email inbound integrations.'),
        email_parsing_fallback: z
            .enum(['open_new_incident', 'discard'])
            .optional()
            .describe('The fallback behavior when email parsing fails for generic email inbound integrations.'),
        email_parsers: z.array(z.unknown()).optional().describe('Email parser configurations for generic email inbound integrations.'),
        email_filters: z
            .array(
                z.object({
                    subject_mode: z.enum(['match', 'no-match', 'always']).describe('How to match the email subject.'),
                    subject_regex: z.string().optional().describe('Regex to apply when subject_mode is match or no-match.'),
                    body_mode: z.enum(['match', 'no-match', 'always']).describe('How to match the email body.'),
                    body_regex: z.string().optional().describe('Regex to apply when body_mode is match or no-match.'),
                    from_email_mode: z.enum(['match', 'no-match', 'always']).describe('How to match the from email address.'),
                    from_email_regex: z.string().optional().describe('Regex to apply when from_email_mode is match or no-match.')
                })
            )
            .optional()
            .describe('Email filter rules for generic email inbound integrations.')
    })
    .describe('Input to update an existing service integration');

const ServiceReferenceSchema = z.object({
    id: z.string(),
    type: z.string(),
    summary: z.string().nullable().optional(),
    self: z.string().nullable().optional(),
    html_url: z.string().nullable().optional()
});

const VendorReferenceSchema = z.object({
    id: z.string(),
    type: z.string(),
    summary: z.string().nullable().optional(),
    self: z.string().nullable().optional(),
    html_url: z.string().nullable().optional()
});

const ProviderResponseSchema = z.object({
    integration: z.object({
        id: z.string(),
        type: z.string(),
        summary: z.string(),
        self: z.string().nullable().optional(),
        html_url: z.string().nullable().optional(),
        name: z.string(),
        service: ServiceReferenceSchema,
        created_at: z.string(),
        vendor: VendorReferenceSchema.nullable().optional(),
        integration_key: z.string().nullable().optional(),
        integration_email: z.string().optional(),
        email_incident_creation: z.string().optional(),
        email_filter_mode: z.string().optional(),
        email_parsing_fallback: z.string().optional(),
        config: z.unknown().optional()
    })
});

const OutputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the integration.'),
        type: z.string().describe('The integration type.'),
        name: z.string().describe('The name of the integration.'),
        summary: z.string().describe('A short summary of the integration.'),
        self: z.string().optional().describe('The API URL of the integration.'),
        html_url: z.string().optional().describe('The PagerDuty web URL of the integration.'),
        service: z
            .object({
                id: z.string().describe('The ID of the parent service.'),
                type: z.string().describe('The type of the parent service reference.'),
                summary: z.string().optional().describe('A short summary of the parent service.'),
                self: z.string().optional().describe('The API URL of the parent service.'),
                html_url: z.string().optional().describe('The PagerDuty web URL of the parent service.')
            })
            .describe('The service this integration belongs to.'),
        created_at: z.string().describe('The date/time when this integration was created.'),
        vendor: z
            .object({
                id: z.string().describe('The ID of the vendor.'),
                type: z.string().describe('The type of the vendor reference.'),
                summary: z.string().optional().describe('A short summary of the vendor.'),
                self: z.string().optional().describe('The API URL of the vendor.'),
                html_url: z.string().optional().describe('The PagerDuty web URL of the vendor.')
            })
            .optional()
            .describe('The vendor associated with this integration.'),
        integration_key: z
            .string()
            .optional()
            .describe('The unique key used to send events to this integration. Absent for integrations such as email that do not use a key.'),
        integration_email: z.string().optional().describe('The email address for generic email inbound integrations.'),
        email_incident_creation: z.string().optional().describe('How incidents should be created from incoming emails.'),
        email_filter_mode: z.string().optional().describe('The filter mode for incoming emails.'),
        email_parsing_fallback: z.string().optional().describe('The fallback behavior when email parsing fails.'),
        config: z.unknown().optional().describe('Integration-specific configuration object.')
    })
    .describe('The updated service integration');

/**
 * @tags: [write]
 * @tagReason: Sends a PUT request to update an existing service integration in PagerDuty.
 */
const action = createAction({
    description: 'Update an existing integration on a service',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['services.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body = {
            integration: {
                ...(input.type !== undefined && { type: input.type }),
                ...(input.name !== undefined && { name: input.name }),
                ...(input.vendor_id !== undefined && { vendor: { id: input.vendor_id, type: 'vendor_reference' } }),
                ...(input.integration_email !== undefined && { integration_email: input.integration_email }),
                ...(input.email_incident_creation !== undefined && { email_incident_creation: input.email_incident_creation }),
                ...(input.email_filter_mode !== undefined && { email_filter_mode: input.email_filter_mode }),
                ...(input.email_parsing_fallback !== undefined && { email_parsing_fallback: input.email_parsing_fallback }),
                ...(input.email_parsers !== undefined && { email_parsers: input.email_parsers }),
                ...(input.email_filters !== undefined && { email_filters: input.email_filters })
            }
        };

        // https://developer.pagerduty.com/api-reference/503d9023fad21-update-an-existing-integration
        const response = await nango.put({
            endpoint: `/services/${encodeURIComponent(input.service_id)}/integrations/${encodeURIComponent(input.integration_id)}`,
            data: body,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const integration = parsed.integration;

        return {
            id: integration.id,
            type: integration.type,
            name: integration.name,
            summary: integration.summary,
            ...(integration.self != null && { self: integration.self }),
            ...(integration.html_url != null && { html_url: integration.html_url }),
            service: {
                id: integration.service.id,
                type: integration.service.type,
                ...(integration.service.summary != null && { summary: integration.service.summary }),
                ...(integration.service.self != null && { self: integration.service.self }),
                ...(integration.service.html_url != null && { html_url: integration.service.html_url })
            },
            created_at: integration.created_at,
            ...(integration.vendor != null && {
                vendor: {
                    id: integration.vendor.id,
                    type: integration.vendor.type,
                    ...(integration.vendor.summary != null && { summary: integration.vendor.summary }),
                    ...(integration.vendor.self != null && { self: integration.vendor.self }),
                    ...(integration.vendor.html_url != null && { html_url: integration.vendor.html_url })
                }
            }),
            ...(integration.integration_key != null && { integration_key: integration.integration_key }),
            ...(integration.integration_email !== undefined && { integration_email: integration.integration_email }),
            ...(integration.email_incident_creation !== undefined && { email_incident_creation: integration.email_incident_creation }),
            ...(integration.email_filter_mode !== undefined && { email_filter_mode: integration.email_filter_mode }),
            ...(integration.email_parsing_fallback !== undefined && { email_parsing_fallback: integration.email_parsing_fallback }),
            ...(integration.config !== undefined && { config: integration.config })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
