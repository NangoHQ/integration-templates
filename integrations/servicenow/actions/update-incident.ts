import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    sys_id: z.string().describe('Incident sys_id. Example: "78058ff5c3ca0310c5a8fc0d0501317d"'),
    short_description: z.string().optional(),
    description: z.string().optional(),
    state: z.string().optional().describe('Incident state code. Example: "2"'),
    impact: z.string().optional().describe('Impact code. Example: "3"'),
    urgency: z.string().optional().describe('Urgency code. Example: "3"'),
    assigned_to: z.string().optional().describe('Sys_id of the user to assign'),
    assignment_group: z.string().optional().describe('Sys_id of the group to assign'),
    comments: z.string().optional().describe('Append-only journal comment'),
    work_notes: z.string().optional().describe('Append-only work notes'),
    active: z.string().optional().describe('Active flag. Example: "true" or "false"'),
    close_code: z.string().optional().describe('Close code required to close the incident'),
    close_notes: z.string().optional().describe('Close notes required to close the incident')
});

function extractStringValue(field: unknown): string | undefined {
    if (typeof field === 'string') {
        return field;
    }
    if (field != null && typeof field === 'object' && 'display_value' in field) {
        const parsed = z.object({ display_value: z.union([z.string(), z.number(), z.boolean()]).optional() }).safeParse(field);
        if (parsed.success && parsed.data.display_value != null) {
            return String(parsed.data.display_value);
        }
    }
    return undefined;
}

const AxiosErrorSchema = z.object({
    response: z.object({
        status: z.number(),
        data: z.unknown().optional()
    })
});

const ProviderIncidentSchema = z.object({
    sys_id: z.string(),
    number: z.unknown().optional(),
    short_description: z.unknown().optional(),
    description: z.unknown().optional(),
    state: z.unknown().optional(),
    impact: z.unknown().optional(),
    urgency: z.unknown().optional(),
    priority: z.unknown().optional(),
    assigned_to: z.unknown().optional(),
    assignment_group: z.unknown().optional(),
    comments: z.unknown().optional(),
    work_notes: z.unknown().optional(),
    active: z.unknown().optional(),
    close_code: z.unknown().optional(),
    close_notes: z.unknown().optional(),
    sys_updated_on: z.unknown().optional(),
    sys_created_on: z.unknown().optional()
});

const OutputSchema = z.object({
    sys_id: z.string(),
    number: z.string().optional(),
    short_description: z.string().optional(),
    description: z.string().optional(),
    state: z.string().optional(),
    impact: z.string().optional(),
    urgency: z.string().optional(),
    priority: z.string().optional(),
    assigned_to: z.string().optional(),
    assignment_group: z.string().optional(),
    comments: z.string().optional(),
    work_notes: z.string().optional(),
    active: z.string().optional(),
    close_code: z.string().optional(),
    close_notes: z.string().optional(),
    sys_updated_on: z.string().optional(),
    sys_created_on: z.string().optional()
});

const action = createAction({
    description: 'Update an incident.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['itil'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Plain fields are safe to overwrite and safe to retry: a retried PATCH just
        // re-applies the same final value.
        const safeData = {
            ...(input.short_description !== undefined && { short_description: input.short_description }),
            ...(input.description !== undefined && { description: input.description }),
            ...(input.state !== undefined && { state: input.state }),
            ...(input.impact !== undefined && { impact: input.impact }),
            ...(input.urgency !== undefined && { urgency: input.urgency }),
            ...(input.assigned_to !== undefined && { assigned_to: input.assigned_to }),
            ...(input.assignment_group !== undefined && { assignment_group: input.assignment_group }),
            ...(input.active !== undefined && { active: input.active }),
            ...(input.close_code !== undefined && { close_code: input.close_code }),
            ...(input.close_notes !== undefined && { close_notes: input.close_notes })
        };

        // comments/work_notes are ServiceNow journal fields: every PATCH appends a new
        // entry rather than overwriting. They must not be retried automatically, or a
        // transient failure followed by a retry can duplicate the entry.
        const journalData = {
            ...(input.comments !== undefined && { comments: input.comments }),
            ...(input.work_notes !== undefined && { work_notes: input.work_notes })
        };

        const endpoint = `/api/now/table/incident/${encodeURIComponent(input.sys_id)}`;

        // @allowTryCatch We catch expected 404s from the provider and map them to a typed
        // ActionError so callers can distinguish "not found" from unexpected failures.
        try {
            if (Object.keys(safeData).length > 0) {
                // https://developer.servicenow.com/dev.do#!/reference/api
                await nango.patch({
                    endpoint,
                    data: safeData,
                    retries: 1
                });
            }

            if (Object.keys(journalData).length > 0) {
                // https://developer.servicenow.com/dev.do#!/reference/api
                await nango.patch({
                    endpoint,
                    data: journalData,
                    // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
                    retries: 0
                });
            }
        } catch (rawError) {
            const parsedError = AxiosErrorSchema.safeParse(rawError);
            if (parsedError.success && parsedError.data.response.status === 404) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'Incident not found',
                    sys_id: input.sys_id
                });
            }

            if (parsedError.success) {
                throw new nango.ActionError({
                    type: 'provider_error',
                    message: 'Failed to update incident',
                    status: parsedError.data.response.status,
                    body: parsedError.data.response.data
                });
            }

            throw rawError;
        }

        // https://developer.servicenow.com/dev.do#!/reference/api
        const getResponse = await nango.get({
            endpoint: `/api/now/table/incident/${encodeURIComponent(input.sys_id)}`,
            params: {
                sysparm_display_value: 'true'
            },
            retries: 3
        });

        if (!getResponse.data || typeof getResponse.data !== 'object' || !('result' in getResponse.data)) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Unexpected response when reading updated incident'
            });
        }

        const rawResult = getResponse.data.result;
        const incident = ProviderIncidentSchema.parse(rawResult);

        return {
            sys_id: incident.sys_id,
            number: extractStringValue(incident.number),
            short_description: extractStringValue(incident.short_description),
            description: extractStringValue(incident.description),
            state: extractStringValue(incident.state),
            impact: extractStringValue(incident.impact),
            urgency: extractStringValue(incident.urgency),
            priority: extractStringValue(incident.priority),
            assigned_to: extractStringValue(incident.assigned_to),
            assignment_group: extractStringValue(incident.assignment_group),
            comments: extractStringValue(incident.comments),
            work_notes: extractStringValue(incident.work_notes),
            active: extractStringValue(incident.active),
            close_code: extractStringValue(incident.close_code),
            close_notes: extractStringValue(incident.close_notes),
            sys_updated_on: extractStringValue(incident.sys_updated_on),
            sys_created_on: extractStringValue(incident.sys_created_on)
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
