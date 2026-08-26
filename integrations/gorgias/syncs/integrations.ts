import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderHttpSchema = z
    .object({
        url: z.string(),
        method: z.string().optional(),
        request_content_type: z.string().optional(),
        response_content_type: z.string().optional(),
        triggers: z.record(z.string(), z.boolean()).optional(),
        form: z.unknown().optional(),
        oauth2: z.unknown().nullable().optional()
    })
    .passthrough()
    .nullable()
    .optional();

const ProviderUserRefSchema = z
    .object({
        id: z.number().int()
    })
    .passthrough()
    .optional();

const ProviderIntegrationSchema = z
    .object({
        id: z.number().int(),
        created_datetime: z.string().nullable().optional(),
        deactivated_datetime: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        http: ProviderHttpSchema,
        name: z.string(),
        type: z.string(),
        updated_datetime: z.string().nullable().optional(),
        user: ProviderUserRefSchema,
        uri: z.string().optional(),
        application_id: z.string().nullable().optional(),
        managed: z.boolean().optional(),
        business_hours_id: z.number().int().nullable().optional()
    })
    .passthrough();

const UserRefSchema = z
    .object({
        id: z.number().int().describe('ID of the user who created the integration')
    })
    .describe('Reference to the user who created the integration');

const HttpConfigSchema = z
    .object({
        url: z.string().describe('URL of the external service endpoint'),
        method: z.string().optional().describe('HTTP method used when calling the external service'),
        request_content_type: z.string().optional().describe('Content type of outgoing requests'),
        response_content_type: z.string().optional().describe('Content type of expected responses'),
        triggers: z.record(z.string(), z.boolean()).optional().describe('Event triggers that invoke the HTTP integration'),
        form: z.unknown().optional().describe('Form or JSON payload data sent to the external service'),
        oauth2: z.unknown().nullable().optional().describe('OAuth2 configuration for the HTTP integration')
    })
    .describe('HTTP-specific configuration for custom HTTP integrations');

const IntegrationSchema = z
    .object({
        id: z.string().describe('Unique identifier of the integration'),
        name: z.string().describe('Name of the integration, such as an email address or app name'),
        type: z.string().describe('Type of integration (e.g., email, http, shopify, aircall)'),
        created_datetime: z.string().optional().describe('ISO 8601 timestamp when the integration was created'),
        updated_datetime: z.string().optional().describe('ISO 8601 timestamp when the integration was last updated'),
        deactivated_datetime: z.string().optional().describe('ISO 8601 timestamp when the integration was deactivated, if applicable'),
        description: z.string().optional().describe('Human-readable description of the integration'),
        managed: z.boolean().optional().describe('Whether the integration is managed by Gorgias'),
        application_id: z.string().optional().describe('ID of the related application, if any'),
        business_hours_id: z.number().int().optional().describe('ID of the business hours associated with this integration'),
        uri: z.string().optional().describe('API URI of the integration resource'),
        user: UserRefSchema.optional().describe('Reference to the user who created the integration'),
        http: HttpConfigSchema.optional().describe('HTTP-specific configuration for custom HTTP integrations')
    })
    .describe('A configured integration connecting Gorgias with external services such as email, chat, or HTTP APIs');

const sync = createSync({
    description: 'Sync configured integrations (email senders, HTTP integrations, apps, etc.)',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Integration: IntegrationSchema
    },

    exec: async (nango) => {
        await nango.trackDeletesStart('Integration');

        const proxyConfig: ProxyConfiguration = {
            // https://developers.gorgias.com/reference/list-integrations
            endpoint: '/api/integrations',
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'meta.next_cursor',
                cursor_name_in_request: 'cursor',
                response_path: 'data',
                limit_name_in_request: 'limit',
                limit: 100
            },
            retries: 10
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const integrations = page.map((record: unknown) => {
                const parsed = ProviderIntegrationSchema.parse(record);

                const http = parsed.http
                    ? {
                          url: parsed.http.url,
                          ...(parsed.http.method != null && { method: parsed.http.method }),
                          ...(parsed.http.request_content_type != null && { request_content_type: parsed.http.request_content_type }),
                          ...(parsed.http.response_content_type != null && { response_content_type: parsed.http.response_content_type }),
                          ...(parsed.http.triggers != null && { triggers: parsed.http.triggers }),
                          ...(parsed.http.form != null && { form: parsed.http.form }),
                          ...(parsed.http.oauth2 != null && { oauth2: parsed.http.oauth2 })
                      }
                    : undefined;

                return {
                    id: String(parsed.id),
                    name: parsed.name,
                    type: parsed.type,
                    ...(parsed.created_datetime != null && { created_datetime: parsed.created_datetime }),
                    ...(parsed.updated_datetime != null && { updated_datetime: parsed.updated_datetime }),
                    ...(parsed.deactivated_datetime != null && { deactivated_datetime: parsed.deactivated_datetime }),
                    ...(parsed.description != null && { description: parsed.description }),
                    ...(parsed.managed != null && { managed: parsed.managed }),
                    ...(parsed.application_id != null && { application_id: parsed.application_id }),
                    ...(parsed.business_hours_id != null && { business_hours_id: parsed.business_hours_id }),
                    ...(parsed.uri != null && { uri: parsed.uri }),
                    ...(parsed.user != null && { user: parsed.user }),
                    ...(http != null && { http })
                };
            });

            if (integrations.length > 0) {
                await nango.batchSave(integrations, 'Integration');
            }
        }

        await nango.trackDeletesEnd('Integration');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
