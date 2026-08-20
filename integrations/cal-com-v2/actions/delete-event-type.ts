import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.number().describe('Event type ID to delete. Example: 123')
    })
    .describe('Input to delete an event type in Cal.com');

const DeleteDataSchema = z.object({
    id: z.number().describe('Deleted event type ID. Example: 123'),
    lengthInMinutes: z.number().describe('Duration of the event type in minutes. Example: 60'),
    title: z.string().describe('Title of the deleted event type. Example: "Learn the secrets of masterchief!"'),
    slug: z.string().describe('URL-safe identifier of the deleted event type. Example: "learn-the-secrets-of-masterchief"')
});

const OutputSchema = z
    .object({
        status: z.enum(['success', 'error']).describe('Response status from the provider'),
        data: DeleteDataSchema.describe('The deleted event type record returned by the provider')
    })
    .describe('Output confirming deletion of an event type in Cal.com');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently removes an event type from the Cal.com account.
 * @pitfalls: Delete is restricted to the event type owner only; team and organization admins who are authorized to read the event type will still receive an authorization error when attempting to delete it.
 */
const action = createAction({
    description: 'Delete an event type in Cal.com.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['EVENT_TYPE_WRITE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let response;
        // @allowTryCatch: The Nango SDK throws for non-2xx responses. Convert Cal.com's error
        // envelope into a structured ActionError instead of letting the raw error propagate.
        try {
            response = await nango.delete({
                // https://cal.com/docs/api-reference/v2/event-types/delete-an-event-type
                endpoint: `/event-types/${encodeURIComponent(input.id)}`,
                headers: {
                    'cal-api-version': '2024-06-14'
                },
                retries: 1
            });
        } catch (err: unknown) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: `Failed to delete event type ${input.id}.`,
                details: err instanceof Error ? err.message : String(err)
            });
        }

        const raw = response.data;
        if (!raw || typeof raw !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected empty or non-object response from Cal.com'
            });
        }

        const parsed = OutputSchema.parse(raw);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
