import { z } from 'zod';
import { createAction } from 'nango';

const InteractionContentSchema = z.object({
    contentTitle: z.string().describe('The title of the content. Example: "Annual Report 2026"'),
    contentId: z.string().optional().describe('A unique identifier for the content in the partner system. Example: "content-123"'),
    contentUrl: z.string().optional().describe('The URL for the content the person looked at. Example: "https://example.com/report"'),
    contentLabel: z.array(z.string()).optional().describe('A list of tags defined for the content. Example: ["sales", "annual"]')
});

const InputSchema = z.object({
    eventId: z.string().describe('The provider unique identifier for the event used for deduplication. Example: "evt-abc-123"'),
    timestamp: z.string().describe('The date and time of the event in ISO 8601 format. Example: "2026-06-12T10:00:00Z"'),
    interactionType: z.string().describe('The type of the event, e.g., "link clicked", "page viewed". Example: "page viewed"'),
    actorEmail: z.string().optional().describe('The email address of the person who performed the event. Example: "api@nango.dev"'),
    actorName: z.string().optional().describe('The name of the person who performed the event. Example: "API Developer"'),
    trackingId: z
        .string()
        .optional()
        .describe('The ID used for tracking the person who did the event. Must be null if a person is sent instead. Example: "track-abc-123"'),
    interaction: InteractionContentSchema.describe('The content the person looked at'),
    sourceSystemName: z.string().optional().describe('The name of the technology partner or company setting up the integration. Example: "Nango"'),
    sessionId: z.string().optional().describe('The identifier for the session, useful for tying related events together. Example: "sess-xyz-789"'),
    device: z.enum(['MOBILE', 'PC']).optional().describe('The device used during the event. Valid values: "MOBILE", "PC"')
});

const ProviderResponseSchema = z.object({
    requestId: z.string().optional()
});

const OutputSchema = z.object({
    requestId: z.string().optional().describe('A Gong request reference Id generated for this request. Can be used for troubleshooting purposes.')
});

const action = createAction({
    description: 'Post a digital interaction event to Gong (web visits, email opens, content engagement, etc.)',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api:digital-interactions:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.trackingId !== undefined && (input.actorEmail || input.actorName)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'trackingId and person (actorEmail/actorName) are mutually exclusive. Provide one or the other, not both.'
            });
        }

        const body: Record<string, unknown> = {
            eventId: input.eventId,
            timestamp: input.timestamp,
            eventType: input.interactionType,
            content: {
                contentTitle: input.interaction.contentTitle,
                ...(input.interaction.contentId !== undefined && { contentId: input.interaction.contentId }),
                ...(input.interaction.contentUrl !== undefined && { contentUrl: input.interaction.contentUrl }),
                ...(input.interaction.contentLabel !== undefined && { contentLabel: input.interaction.contentLabel })
            },
            ...(input.sourceSystemName !== undefined && { sourceSystemName: input.sourceSystemName }),
            ...(input.sessionId !== undefined && { sessionId: input.sessionId }),
            ...(input.device !== undefined && { device: input.device })
        };

        if (input.actorEmail || input.actorName) {
            body['person'] = {
                ...(input.actorName !== undefined && { name: input.actorName }),
                ...(input.actorEmail !== undefined && { email: input.actorEmail })
            };
        }

        if (input.trackingId !== undefined) {
            body['trackingId'] = input.trackingId;
        }

        const response = await nango.post({
            // https://help.gong.io/apidocs/post-a-digital-interaction-v2digital-interaction-1
            endpoint: '/v2/digital-interaction',
            data: body,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            ...(providerResponse.requestId !== undefined && { requestId: providerResponse.requestId })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
