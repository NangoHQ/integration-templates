import { z } from 'zod';
import { createAction } from 'nango';

const MimeTypeSchema = z.enum(['PNG']);

const ThumbnailSizeSchema = z.enum(['THUMBNAIL_SIZE_UNSPECIFIED', 'LARGE', 'MEDIUM', 'SMALL']);

const InputSchema = z
    .object({
        presentationId: z.string().describe('The ID of the presentation containing the slide. Example: "1XFaFcivdWdl-Em5A8HC0_Oua7fSWpw-MR_QDj1AHsPI"'),
        pageId: z.string().describe('The object ID of the slide (page) whose thumbnail to render. Example: "p"'),
        mimeType: MimeTypeSchema.optional().describe('Image format of the thumbnail. Defaults to PNG when omitted.'),
        thumbnailSize: ThumbnailSizeSchema.optional().describe(
            'Predefined thumbnail width: LARGE is 1600px, MEDIUM is 800px, SMALL is 200px. The server picks a size when omitted.'
        )
    })
    .describe('Identifies the presentation slide to render and the optional thumbnail format and size.');

const ProviderThumbnailSchema = z.object({
    width: z.number(),
    height: z.number(),
    contentUrl: z.string()
});

const OutputSchema = z
    .object({
        width: z.number().describe('Width in pixels of the rendered thumbnail image. Example: 800'),
        height: z.number().describe('Height in pixels of the rendered thumbnail image. Example: 450'),
        contentUrl: z.string().describe('Short-lived signed URL pointing to the thumbnail image bytes (about a 30 minute lifetime).')
    })
    .describe('Metadata for the rendered slide thumbnail, including its dimensions and a signed image URL.');

/**
 * @tags: [read]
 * @tagReason: Fetches a rendered thumbnail URL for a slide without modifying any provider state.
 * @pitfalls: contentUrl is a short-lived (~30 minute) signed link tied to the requester's account that may stop working if the presentation's sharing settings change, and it points to the image bytes rather than returning them; when the slide is taller than it is wide the returned width can be smaller than the requested thumbnailSize, and omitting thumbnailSize lets the server choose a size that may vary.
 */
const action = createAction({
    description: 'Get a short-lived signed URL to a rendered image of a slide.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {};

        if (input.mimeType !== undefined) {
            params['thumbnailProperties.mimeType'] = input.mimeType;
        }
        if (input.thumbnailSize !== undefined) {
            params['thumbnailProperties.thumbnailSize'] = input.thumbnailSize;
        }

        const response = await nango.get({
            // https://developers.google.com/slides/api/reference/rest/v1/presentations.pages/getThumbnail
            endpoint: `/v1/presentations/${encodeURIComponent(input.presentationId)}/pages/${encodeURIComponent(input.pageId)}/thumbnail`,
            params,
            retries: 3
        });

        const thumbnail = ProviderThumbnailSchema.parse(response.data);

        return {
            width: thumbnail.width,
            height: thumbnail.height,
            contentUrl: thumbnail.contentUrl
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
