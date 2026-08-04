import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    title: z.string().describe('The title of the incident. Example: "Database latency spike in us-east-1"'),
    customer_impacted: z.boolean().optional().describe('Whether the incident caused customer impact.'),
    severity: z.string().optional().describe('Incident severity. Example: "SEV-1", "SEV-2", "SEV-3", "SEV-4", "SEV-5"'),
    state: z.string().optional().describe('Incident state. Example: "active", "stable", "resolved"'),
    customer_impact_scope: z.string().optional().describe('A description of the customer impact scope.'),
    notification_handles: z
        .array(
            z.object({
                handle: z.string()
            })
        )
        .optional()
        .describe('Notification handles to alert when the incident is created.')
});

const ProviderIncidentSchema = z.object({
    id: z.string(),
    type: z.string(),
    attributes: z
        .object({
            title: z.string(),
            created: z.string().optional(),
            modified: z.string().optional(),
            customer_impacted: z.boolean().nullable().optional(),
            customer_impact_scope: z.string().nullable().optional(),
            severity: z.string().nullable().optional(),
            state: z.string().nullable().optional(),
            created_by: z.unknown().optional(),
            last_modified_by: z.unknown().optional(),
            commander: z.unknown().optional(),
            fields: z.unknown().optional(),
            notification_handles: z.unknown().optional()
        })
        .passthrough(),
    relationships: z.unknown().optional()
});

const ProviderResponseSchema = z.object({
    data: ProviderIncidentSchema
});

const OutputSchema = z.object({
    id: z.string(),
    title: z.string(),
    created: z.string().optional(),
    modified: z.string().optional(),
    customer_impacted: z.boolean().optional(),
    customer_impact_scope: z.string().optional(),
    severity: z.string().optional(),
    state: z.string().optional()
});

const action = createAction({
    description: 'Create a new incident.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['incidents_write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: {
            data: {
                type: string;
                attributes: {
                    title: string;
                    customer_impacted?: boolean;
                    severity?: string;
                    state?: string;
                    customer_impact_scope?: string;
                    notification_handles?: Array<{ handle: string }>;
                };
            };
        } = {
            data: {
                type: 'incidents',
                attributes: {
                    title: input.title,
                    ...(input.customer_impacted !== undefined && { customer_impacted: input.customer_impacted }),
                    ...(input.severity !== undefined && { severity: input.severity }),
                    ...(input.state !== undefined && { state: input.state }),
                    ...(input.customer_impact_scope !== undefined && { customer_impact_scope: input.customer_impact_scope }),
                    ...(input.notification_handles !== undefined && { notification_handles: input.notification_handles })
                }
            }
        };

        // https://docs.datadoghq.com/api/latest/incidents/#create-an-incident
        const response = await nango.post({
            endpoint: 'v2/incidents',
            data: requestBody,
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Provider returned an unexpected response shape.',
                details: parsed.error.issues
            });
        }

        const incident = parsed.data.data;
        const attrs = incident.attributes;

        return {
            id: incident.id,
            title: attrs.title,
            ...(attrs.created != null && { created: attrs.created }),
            ...(attrs.modified != null && { modified: attrs.modified }),
            ...(attrs.customer_impacted != null && { customer_impacted: attrs.customer_impacted }),
            ...(attrs.customer_impact_scope != null && { customer_impact_scope: attrs.customer_impact_scope }),
            ...(attrs.severity != null && { severity: attrs.severity }),
            ...(attrs.state != null && { state: attrs.state })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
