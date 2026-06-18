import { z } from 'zod';
import { createAction } from 'nango';

const ObjectSizeDimensionSchema = z.object({
    magnitude: z.number(),
    unit: z.string()
});

const InputSchema = z.object({
    documentId: z.string().describe('Google Docs document ID. Example: "1Kj3d86Z-Sfd56YP4dImQ-ggMRyP2QZ_BRO33zOO224c"'),
    imageUri: z.string().describe('Publicly accessible image URL. Example: "https://example.com/image.png"'),
    location: z
        .object({
            segmentId: z.string().optional(),
            index: z.number()
        })
        .optional()
        .describe('Specific location in the document to insert the image.'),
    endOfSegmentLocation: z
        .object({
            segmentId: z.string().optional()
        })
        .optional()
        .describe('Insert at the end of a segment.'),
    objectSize: z
        .object({
            width: ObjectSizeDimensionSchema.optional(),
            height: ObjectSizeDimensionSchema.optional()
        })
        .optional()
        .describe('Optional size for the inserted image.')
});

const InsertInlineImageReplySchema = z.object({
    objectId: z.string().optional()
});

const ReplySchema = z.object({
    insertInlineImage: InsertInlineImageReplySchema.optional()
});

const BatchUpdateResponseSchema = z.object({
    documentId: z.string().optional(),
    replies: z.array(z.unknown()).optional(),
    writeLocation: z.unknown().optional()
});

const OutputSchema = z.object({
    documentId: z.string(),
    inlineObjectId: z.string().optional()
});

const action = createAction({
    description: 'Insert an inline image from a public URL.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['documents', 'drive', 'drive.file'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (!input.location && !input.endOfSegmentLocation) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Either location or endOfSegmentLocation must be provided.'
            });
        }

        if (input.location && input.endOfSegmentLocation) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Only one of location or endOfSegmentLocation should be provided, not both.'
            });
        }

        const request = {
            insertInlineImage: {
                uri: input.imageUri,
                ...(input.location && {
                    location: {
                        segmentId: input.location.segmentId ?? '',
                        index: input.location.index
                    }
                }),
                ...(input.endOfSegmentLocation && {
                    endOfSegmentLocation: {
                        segmentId: input.endOfSegmentLocation.segmentId ?? ''
                    }
                }),
                ...(input.objectSize && {
                    objectSize: {
                        ...(input.objectSize.width && {
                            width: {
                                magnitude: input.objectSize.width.magnitude,
                                unit: input.objectSize.width.unit
                            }
                        }),
                        ...(input.objectSize.height && {
                            height: {
                                magnitude: input.objectSize.height.magnitude,
                                unit: input.objectSize.height.unit
                            }
                        })
                    }
                })
            }
        };

        // https://developers.google.com/docs/api/reference/rest/v1/documents/batchUpdate
        const response = await nango.post({
            endpoint: `/v1/documents/${encodeURIComponent(input.documentId)}:batchUpdate`,
            data: {
                requests: [request]
            },
            retries: 3
        });

        const batchResponse = BatchUpdateResponseSchema.parse(response.data);

        let inlineObjectId: string | undefined;
        if (Array.isArray(batchResponse.replies) && batchResponse.replies.length > 0) {
            const firstReply = batchResponse.replies[0];
            const parsedReply = ReplySchema.safeParse(firstReply);
            if (parsedReply.success && parsedReply.data.insertInlineImage?.objectId) {
                inlineObjectId = parsedReply.data.insertInlineImage.objectId;
            }
        }

        return {
            documentId: input.documentId,
            ...(inlineObjectId !== undefined && { inlineObjectId })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
