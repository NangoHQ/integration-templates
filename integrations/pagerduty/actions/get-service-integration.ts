import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        service_id: z.string().describe('The ID of the PagerDuty service that owns the integration. Example: "PZW5AR6"'),
        integration_id: z.string().describe('The ID of the integration to retrieve. Example: "P02BMK1"')
    })
    .describe('Input parameters to retrieve a single service integration.');

const ProviderReferenceSchema = z
    .object({
        id: z.string(),
        type: z.string(),
        summary: z.string().nullable().optional(),
        self: z.string().nullable().optional(),
        html_url: z.string().nullable().optional()
    })
    .passthrough();

const ProviderIntegrationSchema = z
    .object({
        id: z.string(),
        type: z.string(),
        summary: z.string(),
        self: z.string().nullable().optional(),
        html_url: z.string().nullable().optional(),
        name: z.string().nullable().optional(),
        created_at: z.string().nullable().optional(),
        service: ProviderReferenceSchema.nullable().optional(),
        vendor: ProviderReferenceSchema.nullable().optional(),
        integration_key: z.string().nullable().optional(),
        config: z.record(z.string(), z.unknown()).nullable().optional()
    })
    .passthrough();

const OutputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the integration.'),
        type: z.string().describe('The PagerDuty resource type, typically "service_integration".'),
        summary: z.string().describe('A short summary of the integration.'),
        self: z.string().optional().describe('The API URL of the integration resource.'),
        html_url: z.string().optional().describe('The PagerDuty web URL of the integration resource.'),
        name: z.string().optional().describe('The display name of the integration.'),
        created_at: z.string().optional().describe('The ISO 8601 timestamp when the integration was created.'),
        service: z
            .object({
                id: z.string().describe('The unique identifier of the parent service.'),
                type: z.string().describe('The PagerDuty resource type of the parent service, typically "service_reference".'),
                summary: z.string().optional().describe('A short summary of the parent service.'),
                self: z.string().optional().describe('The API URL of the parent service resource.'),
                html_url: z.string().optional().describe('The PagerDuty web URL of the parent service resource.')
            })
            .passthrough()
            .optional()
            .describe('Reference to the parent service that owns this integration.'),
        vendor: z
            .object({
                id: z.string().describe('The unique identifier of the vendor.'),
                type: z.string().describe('The PagerDuty resource type of the vendor, typically "vendor_reference".'),
                summary: z.string().optional().describe('A short summary of the vendor.'),
                self: z.string().optional().describe('The API URL of the vendor resource.'),
                html_url: z.string().optional().describe('The PagerDuty web URL of the vendor resource.')
            })
            .passthrough()
            .optional()
            .describe('Reference to the vendor that provides this integration type.'),
        integration_key: z.string().optional().describe('The integration key used to send events to this integration.'),
        config: z.record(z.string(), z.unknown()).optional().describe('Vendor-specific configuration object for the integration.')
    })
    .passthrough()
    .describe('A single PagerDuty service integration resource.');

function normalizeReference(ref: z.infer<typeof ProviderReferenceSchema> | null | undefined) {
    if (!ref) {
        return undefined;
    }
    return {
        id: ref.id,
        type: ref.type,
        ...(ref.summary != null && { summary: ref.summary }),
        ...(ref.self != null && { self: ref.self }),
        ...(ref.html_url != null && { html_url: ref.html_url }),
        ...Object.fromEntries(Object.entries(ref).filter(([k]) => !['id', 'type', 'summary', 'self', 'html_url'].includes(k)))
    };
}

function normalizeIntegration(integration: z.infer<typeof ProviderIntegrationSchema>): z.infer<typeof OutputSchema> {
    return {
        id: integration.id,
        type: integration.type,
        summary: integration.summary,
        ...(integration.self != null && { self: integration.self }),
        ...(integration.html_url != null && { html_url: integration.html_url }),
        ...(integration.name != null && { name: integration.name }),
        ...(integration.created_at != null && { created_at: integration.created_at }),
        ...(integration.service != null && { service: normalizeReference(integration.service) }),
        ...(integration.vendor != null && { vendor: normalizeReference(integration.vendor) }),
        ...(integration.integration_key != null && { integration_key: integration.integration_key }),
        ...(integration.config != null && { config: integration.config }),
        ...Object.fromEntries(
            Object.entries(integration).filter(
                ([k]) => !['id', 'type', 'summary', 'self', 'html_url', 'name', 'created_at', 'service', 'vendor', 'integration_key', 'config'].includes(k)
            )
        )
    };
}

/**
 * @tags: [read]
 * @tagReason: Retrieves a single integration from the PagerDuty API without modifying any data.
 * @pitfalls: There is no way to list a service's integrations directly; callers must retrieve the parent service and read its embedded integrations array to discover IDs.
 */
const action = createAction({
    description: 'Retrieve a single integration on a service.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['services.read'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.pagerduty.com/api-reference/c4e0b0e0a6a7f-get-an-integration
            endpoint: `/services/${encodeURIComponent(input.service_id)}/integrations/${encodeURIComponent(input.integration_id)}`,
            retries: 3
        });

        const providerSchema = z.object({ integration: ProviderIntegrationSchema });
        const parsed = providerSchema.parse(response.data);

        return normalizeIntegration(parsed.integration);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
