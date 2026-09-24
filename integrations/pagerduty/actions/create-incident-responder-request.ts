import { z } from 'zod';
import { createAction } from 'nango';

const ResponderRequestTargetInputSchema = z
    .object({
        responder_request_target: z
            .object({
                id: z.string().describe('The ID of the target user, team, or escalation policy.'),
                type: z.string().describe('The PagerDuty type of the target, e.g. user_reference, team_reference, or escalation_policy_reference.')
            })
            .describe('A single responder request target to add.')
    })
    .describe('Wrapper object for a responder request target.');

const InputSchema = z
    .object({
        incident_id: z.string().describe('The ID of the incident to request additional responders for.'),
        requester_id: z.string().describe('The ID of the user making the responder request.'),
        message: z.string().describe('A message to include with the responder request.'),
        responder_request_targets: z
            .array(ResponderRequestTargetInputSchema)
            .describe('Array of users, teams, or escalation policies to request as responders.')
    })
    .describe('Input for creating a responder request on an incident.');

const ReferenceSchema = z.object({
    id: z.string().describe('The unique identifier of the referenced object.'),
    type: z.string().describe('The PagerDuty object type, typically suffixed with _reference.'),
    summary: z.string().nullable().optional().describe('A short-form, server-generated summary of the referenced object.'),
    self: z.string().nullable().optional().describe('The API show URL at which the object is accessible.'),
    html_url: z.string().nullable().optional().describe('A URL at which the entity is uniquely displayed in the PagerDuty Web app.')
});

const IncidentResponderSchema = z.object({
    state: z.string().describe('The status of the responder request, e.g. pending, joined, declined, or user_cancelled.'),
    user: ReferenceSchema.describe('The user associated with this responder request.'),
    incident: ReferenceSchema.describe('The incident this responder request is for.'),
    updated_at: z.string().optional().describe('The time this responder request was last updated.'),
    message: z.string().optional().describe('The message sent with the responder request.'),
    requester: ReferenceSchema.optional().describe('The user who made the responder request.'),
    requested_at: z.string().optional().describe('The time the responder request was made.'),
    escalation_policy_requests: z.array(z.string()).optional().describe('Names of escalation policies this responder was requested through, if applicable.')
});

const ResponderRequestTargetOutputSchema = z.object({
    responder_request_target: z
        .object({
            type: z.string().describe('The type of the responder target.'),
            id: z.string().describe('The ID of the responder target.'),
            summary: z.string().nullable().optional().describe('A short-form summary of the responder target.'),
            incidents_responders: z.array(IncidentResponderSchema).describe('An array of responders associated with the incident.')
        })
        .describe('A single responder request target in the response.')
});

const ResponderRequestSchema = z.object({
    id: z.string().describe('The ID of the responder request.'),
    incident: ReferenceSchema.describe('The incident the responder request was created for.'),
    requester: ReferenceSchema.describe('The user who made the responder request.'),
    requested_at: z.string().describe('The time the responder request was made.'),
    message: z.string().describe('The message sent with the responder request.'),
    responder_request_targets: z.array(ResponderRequestTargetOutputSchema).describe('The array of targets the responder request was sent to.')
});

const OutputSchema = z
    .object({
        responder_request: ResponderRequestSchema.describe('The created responder request.')
    })
    .describe('Output containing the created incident responder request.');

/**
 * @tags: [write]
 * @tagReason: Creates a new responder request on an incident, notifying the target users, teams, or escalation policies.
 * @pitfalls: Returns 402 Payment Required if the account lacks the coordinated_responding ability.
 */
const action = createAction({
    description: 'Request additional responders (users, teams, or escalation policies) join an incident.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['incidents.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.pagerduty.com/api-reference/a242737f80819-request-additional-responders-for-an-incident
        const response = await nango.post({
            endpoint: `/incidents/${encodeURIComponent(input.incident_id)}/responder_requests`,
            data: {
                requester_id: input.requester_id,
                message: input.message,
                responder_request_targets: input.responder_request_targets
            },
            retries: 3
        });

        const parsed = OutputSchema.parse(response.data);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
