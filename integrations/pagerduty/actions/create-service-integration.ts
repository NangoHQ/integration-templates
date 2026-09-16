import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        service_id: z.string().describe('The ID of the PagerDuty service to create the integration on.'),
        type: z.string().describe('The integration type, e.g. "generic_events_api_inbound_integration" or a vendor-specific type.'),
        name: z.string().describe('The display name of the integration.'),
        vendor_id: z
            .string()
            .optional()
            .describe('The vendor ID for vendor-specific integrations. Optional for generic Events API types, required for vendor-specific types.')
    })
    .describe('Input for creating a new service integration.');

const ProviderServiceRefSchema = z.object({
    id: z.string(),
    type: z.string()
});

const ProviderVendorRefSchema = z.object({
    id: z.string(),
    type: z.string()
});

const ProviderIntegrationSchema = z.object({
    id: z.string(),
    type: z.string(),
    name: z.string(),
    summary: z.string().optional(),
    self: z.string().optional(),
    html_url: z.string().optional(),
    service: ProviderServiceRefSchema,
    created_at: z.string().optional(),
    vendor: ProviderVendorRefSchema.optional(),
    integration_key: z.string().optional(),
    integration_email: z.string().optional()
});

const ProviderResponseSchema = z.object({
    integration: ProviderIntegrationSchema
});

const OutputSchema = z
    .object({
        id: z.string().describe('The unique ID of the created integration.'),
        type: z.string().describe('The integration type.'),
        name: z.string().describe('The display name of the integration.'),
        service_id: z.string().describe('The ID of the service this integration belongs to.'),
        summary: z.string().optional().describe('A short summary description of the integration.'),
        html_url: z.string().optional().describe('The URL to view the integration in the PagerDuty web app.'),
        created_at: z.string().optional().describe('ISO 8601 timestamp when the integration was created.'),
        vendor_id: z.string().optional().describe('The vendor ID if the integration is tied to a vendor-specific type.'),
        integration_key: z.string().optional().describe('The auto-generated integration key for event-based integrations.'),
        integration_email: z.string().optional().describe('The integration email address for email-based integrations.')
    })
    .describe('Output of a newly created service integration.');

/**
 * @tags: [write]
 * @tagReason: Creates a new integration (event source) on a PagerDuty service.
 * @pitfalls: vendor_id is optional for generic Events API v1/v2 integration types but required for vendor-specific types, whose IDs must be discovered via the Vendors API.
 */
const action = createAction({
    description: 'Create a new integration (event source) on a service.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['services.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.pagerduty.com/api-reference/b3A6Mjc0ODIwMw-create-a-new-integration
            endpoint: `/services/${encodeURIComponent(input.service_id)}/integrations`,
            data: {
                integration: {
                    type: input.type,
                    name: input.name,
                    ...(input.vendor_id !== undefined && {
                        vendor: {
                            id: input.vendor_id,
                            type: 'vendor_reference'
                        }
                    })
                }
            },
            retries: 10
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const integration = providerResponse.integration;

        return {
            id: integration.id,
            type: integration.type,
            name: integration.name,
            service_id: integration.service.id,
            ...(integration.summary !== undefined && { summary: integration.summary }),
            ...(integration.html_url !== undefined && { html_url: integration.html_url }),
            ...(integration.created_at !== undefined && { created_at: integration.created_at }),
            ...(integration.vendor !== undefined && { vendor_id: integration.vendor.id }),
            ...(integration.integration_key !== undefined && { integration_key: integration.integration_key }),
            ...(integration.integration_email !== undefined && { integration_email: integration.integration_email })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
