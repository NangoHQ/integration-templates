import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        subject: z.string().optional().describe('Subject line of the appointment. Example: "Quarterly business review"'),
        scheduledstart: z.string().describe('Start date and time of the appointment as an ISO 8601 timestamp. Example: "2026-09-29T15:00:00Z"'),
        scheduledend: z.string().describe('End date and time of the appointment as an ISO 8601 timestamp. Example: "2026-09-29T16:00:00Z"'),
        description: z.string().optional().describe('Body text or notes for the appointment'),
        location: z.string().optional().describe('Free-text location of the appointment. Example: "Contoso HQ, Room 4"')
    })
    .describe('Fields for the new appointment activity');

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier (activityid GUID) of the created appointment. Example: "5d5f2c6b-0d8f-4e2c-9f5e-3b0a1c2d4e5f"')
    })
    .describe('The created appointment identifier');

/**
 * @tags: [write]
 * @tagReason: Creates a new appointment record in Dataverse via POST; performs no reads or deletes.
 * @pitfalls: Dataverse returns an empty 204 No Content response on create, so this action returns only the new appointment id and a separate fetch is needed to read back stored fields. The appointment is created standalone: the API accepts creates with no attendees and no regarding record, so linking it to a CRM record or adding participants requires separate calls.
 */
const action = createAction({
    description: 'Create an appointment activity',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/create-entity
            endpoint: '/api/data/v9.2/appointments',
            data: {
                scheduledstart: input.scheduledstart,
                scheduledend: input.scheduledend,
                ...(input.subject !== undefined && { subject: input.subject }),
                ...(input.description !== undefined && { description: input.description }),
                ...(input.location !== undefined && { location: input.location })
            },
            // No retries: creating an appointment is not idempotent, so a retry after a lost response would create a duplicate record
            retries: 10
        };

        const response = await nango.post(config);

        const entityIdHeader = response.headers['odata-entityid'];
        const match =
            typeof entityIdHeader === 'string'
                ? entityIdHeader.match(/\(([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\)/)
                : null;
        const id = match?.[1];
        if (!id) {
            throw new Error('Dataverse create succeeded but the OData-EntityId response header was missing or malformed.');
        }

        return { id };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
