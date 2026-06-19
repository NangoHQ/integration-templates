import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    eventId: z
        .string()
        .describe(
            'The ID of the event to list attachments for. Example: "AAMkAGVmMDEzMTM4LTZmYWUtNDdkNC1hMDZiLTU1OGY5OTZhYmY4OABGAAAAAAAiQ8W967B7TKBjgx9rVEURBwAiIsqMbYjsT5e-T7KzowPTAAAAAAENAAAiIsqMbYjsT5e-T7KzowPTAAAa_WKzAAA="'
        )
});

const AttachmentSchema = z.object({
    id: z.string(),
    contentType: z.string().optional(),
    isInline: z.boolean().optional(),
    lastModifiedDateTime: z.string().optional(),
    name: z.string().optional(),
    size: z.number().optional()
});

const ProviderResponseSchema = z.object({
    value: z.array(z.unknown()),
    '@odata.nextLink': z.string().optional()
});

const OutputSchema = z.object({
    attachments: z.array(AttachmentSchema),
    nextLink: z.string().optional().describe('Pagination link for the next page of results. Omit for the first page.')
});

const action = createAction({
    description: 'List attachments on an event.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Calendars.Read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/graph/api/event-list-attachments
        const response = await nango.get({
            endpoint: `/v1.0/me/events/${encodeURIComponent(input.eventId)}/attachments`,
            retries: 3
        });

        const parsedResponse = ProviderResponseSchema.parse(response.data);

        const attachments: z.infer<typeof AttachmentSchema>[] = [];
        for (const item of parsedResponse.value) {
            const parsedAttachment = AttachmentSchema.safeParse(item);
            if (parsedAttachment.success) {
                attachments.push(parsedAttachment.data);
            }
        }

        return {
            attachments: attachments,
            ...(parsedResponse['@odata.nextLink'] !== undefined && { nextLink: parsedResponse['@odata.nextLink'] })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
