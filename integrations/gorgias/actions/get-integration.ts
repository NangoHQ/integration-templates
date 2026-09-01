import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.number().describe('The ID of the integration to retrieve. Example: 126637')
    })
    .describe('Input for retrieving a single integration configuration.');

const HttpTriggersSchema = z.object({
    'ticket-created': z.boolean().optional().describe('Whether to trigger the HTTP integration when a ticket is created.'),
    'ticket-updated': z.boolean().optional().describe('Whether to trigger the HTTP integration when a ticket is updated.'),
    'ticket-message-created': z.boolean().optional().describe('Whether to trigger the HTTP integration when a new message is created in a ticket.'),
    'ticket-self-unsnoozed': z.boolean().optional().describe('Whether to trigger the HTTP integration when the snooze delay ends.'),
    'ticket-message-failed': z.boolean().optional().describe('Whether to trigger the HTTP integration when a message fails to send.'),
    'ticket-assignment-updated': z.boolean().optional().describe('Whether to trigger the HTTP integration when the ticket assignee is changed.'),
    'ticket-status-updated': z.boolean().optional().describe('Whether to trigger the HTTP integration when the ticket status is updated.'),
    'ticket-handed-over': z.boolean().optional().describe('Whether to trigger the HTTP integration when a ticket is handed over to another user.')
});

const HttpConfigSchema = z.object({
    url: z.string().optional().describe('URL of the external service.'),
    method: z.string().optional().describe('HTTP method expected by the external service.'),
    form: z.record(z.string(), z.unknown()).optional().describe('Data to send to the external service.'),
    triggers: HttpTriggersSchema.optional().describe('Events that trigger the request to the external service.'),
    request_content_type: z.string().optional().describe('Content type of the outgoing request.'),
    response_content_type: z.string().optional().describe('Content type of the incoming response.')
});

const UserSchema = z.object({
    id: z.number().describe('ID of the user who created this integration.')
});

const OutputSchema = z
    .object({
        id: z.number().describe('ID of the integration.'),
        name: z.string().describe('Name of the integration.'),
        type: z.string().describe('Type of integration.'),
        uri: z.string().describe('URI of the integration.'),
        created_datetime: z.string().optional().describe('When the integration was created.'),
        updated_datetime: z.string().optional().describe('When the integration was last updated.'),
        deactivated_datetime: z.string().optional().describe('When the integration was deactivated.'),
        description: z.string().optional().describe('Description about the integration.'),
        user: UserSchema.optional().describe('User which created this integration.'),
        application_id: z.string().optional().describe('ID of the related application.'),
        managed: z.boolean().optional().describe('Whether the integration is managed by Gorgias.'),
        business_hours_id: z.number().optional().describe('The ID of the business hour the phone integration is associated with.'),
        http: HttpConfigSchema.optional().describe('HTTP integration configuration. Only present for HTTP integrations.')
    })
    .describe('A single integration configuration from Gorgias.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single integration configuration from the provider.
 * @pitfalls: The provider API returns a provider-specific 'meta' object (e.g. email address, verification status) that is omitted from this action's normalized output; only common fields are returned.
 */
const action = createAction({
    description: "Retrieve a single integration's configuration.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['integrations:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.gorgias.com/reference/get-integration
            endpoint: `/api/integrations/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        const raw = response.data;

        if (!raw) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Integration not found',
                id: input.id
            });
        }

        const providerIntegration = z
            .object({
                id: z.number(),
                name: z.string(),
                type: z.string(),
                uri: z.string(),
                created_datetime: z.string().nullable().optional(),
                updated_datetime: z.string().nullable().optional(),
                deactivated_datetime: z.string().nullable().optional(),
                description: z.string().nullable().optional(),
                user: z.object({ id: z.number() }).optional(),
                application_id: z.string().nullable().optional(),
                managed: z.boolean().optional(),
                business_hours_id: z.number().nullable().optional(),
                http: z
                    .object({
                        url: z.string(),
                        method: z.string().optional(),
                        form: z.record(z.string(), z.unknown()).nullable().optional(),
                        triggers: z.record(z.string(), z.boolean()).optional(),
                        request_content_type: z.string().optional(),
                        response_content_type: z.string().optional()
                    })
                    .nullable()
                    .optional()
            })
            .parse(raw);

        return {
            id: providerIntegration.id,
            name: providerIntegration.name,
            type: providerIntegration.type,
            uri: providerIntegration.uri,
            ...(providerIntegration.created_datetime != null && { created_datetime: providerIntegration.created_datetime }),
            ...(providerIntegration.updated_datetime != null && { updated_datetime: providerIntegration.updated_datetime }),
            ...(providerIntegration.deactivated_datetime != null && { deactivated_datetime: providerIntegration.deactivated_datetime }),
            ...(providerIntegration.description != null && { description: providerIntegration.description }),
            ...(providerIntegration.user && { user: providerIntegration.user }),
            ...(providerIntegration.application_id != null && { application_id: providerIntegration.application_id }),
            ...(providerIntegration.managed !== undefined && { managed: providerIntegration.managed }),
            ...(providerIntegration.business_hours_id != null && { business_hours_id: providerIntegration.business_hours_id }),
            ...(providerIntegration.http && {
                http: {
                    url: providerIntegration.http.url,
                    ...(providerIntegration.http.method !== undefined && { method: providerIntegration.http.method }),
                    ...(providerIntegration.http.form != null && { form: providerIntegration.http.form }),
                    ...(providerIntegration.http.triggers !== undefined && { triggers: providerIntegration.http.triggers }),
                    ...(providerIntegration.http.request_content_type !== undefined && { request_content_type: providerIntegration.http.request_content_type }),
                    ...(providerIntegration.http.response_content_type !== undefined && {
                        response_content_type: providerIntegration.http.response_content_type
                    })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
