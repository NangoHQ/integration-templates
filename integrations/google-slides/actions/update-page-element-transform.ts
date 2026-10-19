import { z } from 'zod';
import { createAction } from 'nango';

const AffineTransformSchema = z.object({
    scaleX: z.number().optional().describe('X-axis scale factor of the transform. Example: 1'),
    scaleY: z.number().optional().describe('Y-axis scale factor of the transform. Example: 1'),
    shearX: z.number().optional().describe('X-axis shear factor of the transform. Example: 0'),
    shearY: z.number().optional().describe('Y-axis shear factor of the transform. Example: 0'),
    translateX: z.number().optional().describe('X-axis translation, expressed in the transform unit. Example: 200000'),
    translateY: z.number().optional().describe('Y-axis translation, expressed in the transform unit. Example: 550000'),
    unit: z.enum(['EMU', 'PT']).describe('Unit for the translate values: EMU (English Metric Units) or PT (points). The API requires a unit.')
});

const InputSchema = z
    .object({
        presentationId: z.string().describe('Google Slides presentation ID. Example: "1XFaFcivdWdl-Em5A8HC0_Oua7fSWpw-MR_QDj1AHsPI"'),
        objectId: z.string().describe('Object ID of the page element to update, such as a shape, image, table, or group. Example: "my_rect_1"'),
        applyMode: z
            .enum(['ABSOLUTE', 'RELATIVE'])
            .describe(
                'ABSOLUTE replaces the element transform outright (omitted parameters become 0); RELATIVE composes the given transform onto the existing one.'
            ),
        transform: AffineTransformSchema.describe('Affine transform to apply to the page element.')
    })
    .describe('Input for updating the transform of a page element in a Google Slides presentation.');

const ProviderResponseSchema = z.object({
    presentationId: z.string(),
    replies: z.array(z.unknown()).optional(),
    writeControl: z
        .object({
            requiredRevisionId: z.string().optional()
        })
        .optional()
});

const OutputSchema = z
    .object({
        presentationId: z.string().describe('ID of the presentation that was updated.'),
        revisionId: z.string().optional().describe('Revision ID of the presentation after the update, when returned by the API.')
    })
    .describe('Result of applying a page element transform update.');

/**
 * @tags: [write]
 * @tagReason: Applies an updatePageElementTransform request that mutates the transform of a page element in the presentation.
 * @pitfalls: applyMode and a transform unit are required; RELATIVE needs non-zero scaleX/scaleY or the provider rejects the transform as non-invertible; ABSOLUTE replaces the transform and zeroes omitted parameters, while RELATIVE composes onto the existing one (so repeating it double-applies), and the provider may normalize the scale values it stores.
 */
const action = createAction({
    description: 'Resize, move, or rotate a page element (shape, image, table, or group) on a slide.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/presentations'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/slides/api/reference/rest/v1/presentations/batchUpdate
        const response = await nango.post({
            endpoint: `/v1/presentations/${encodeURIComponent(input.presentationId)}:batchUpdate`,
            data: {
                requests: [
                    {
                        updatePageElementTransform: {
                            objectId: input.objectId,
                            applyMode: input.applyMode,
                            transform: input.transform
                        }
                    }
                ]
            },
            // Transform writes are not idempotent in RELATIVE mode (they compose onto the existing transform), so a retry after a lost response could double-apply.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            presentationId: parsed.presentationId,
            ...(parsed.writeControl?.requiredRevisionId !== undefined && { revisionId: parsed.writeControl.requiredRevisionId })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
