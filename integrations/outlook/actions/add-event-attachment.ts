import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    eventId: z.string().describe('Event ID. Example: "AAMkAGI1AAAt9AHjAAA="'),
    name: z.string().describe('File name. Example: "menu.txt"'),
    contentBytes: z.string().describe('Base64-encoded file content. Example: "bWFjIGFuZCBjaGVlc2UgdG9kYXk="'),
    contentType: z.string().optional().describe('MIME type of the attachment. Example: "text/plain"')
});

const ProviderAttachmentSchema = z.object({
    id: z.string(),
    '@odata.type': z.string().optional(),
    name: z.string(),
    contentType: z.string().nullable().optional(),
    size: z.number().optional(),
    isInline: z.boolean().optional(),
    lastModifiedDateTime: z.string().optional(),
    contentId: z.string().nullable().optional(),
    contentLocation: z.string().nullable().optional(),
    contentBytes: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    contentType: z.string().optional(),
    size: z.number().optional(),
    isInline: z.boolean().optional(),
    lastModifiedDateTime: z.string().optional()
});

const action = createAction({
    description: 'Attach a small file (under 3 MB) to an Outlook event.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/add-event-attachment',
        group: 'Events'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Calendars.ReadWrite'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const payload: {
            '@odata.type': string;
            name: string;
            contentBytes: string;
            contentType?: string;
        } = {
            '@odata.type': '#microsoft.graph.fileAttachment',
            name: input.name,
            contentBytes: input.contentBytes
        };

        if (input.contentType !== undefined) {
            payload.contentType = input.contentType;
        }

        // https://learn.microsoft.com/graph/api/event-post-attachments
        const response = await nango.post({
            endpoint: `/v1.0/me/events/${encodeURIComponent(input.eventId)}/attachments`,
            data: payload,
            retries: 2
        });

        const providerAttachment = ProviderAttachmentSchema.parse(response.data);

        return {
            id: providerAttachment.id,
            name: providerAttachment.name,
            ...(providerAttachment.contentType != null && {
                contentType: providerAttachment.contentType
            }),
            ...(providerAttachment.size !== undefined && {
                size: providerAttachment.size
            }),
            ...(providerAttachment.isInline !== undefined && {
                isInline: providerAttachment.isInline
            }),
            ...(providerAttachment.lastModifiedDateTime != null && {
                lastModifiedDateTime: providerAttachment.lastModifiedDateTime
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
