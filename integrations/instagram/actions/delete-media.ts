import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        mediaId: z.string().min(1).describe('The ID of the published Instagram media object to delete.')
    })
    .describe('Input for deleting an Instagram media object.');

const ProviderErrorSchema = z.object({
    error: z.object({
        message: z.string(),
        type: z.string().optional(),
        code: z.number().optional(),
        error_subcode: z.number().optional()
    })
});

const ErrorOutputSchema = z.object({
    message: z.string().describe('Human-readable provider error message.'),
    type: z.string().optional().describe('Provider error type, such as "IGApiException".'),
    code: z.number().optional().describe('Numeric provider error code.'),
    subcode: z.number().optional().describe('Numeric provider error subcode.')
});

const OutputSchema = z
    .object({
        mediaId: z.string().describe('The ID of the media object targeted by the delete request.'),
        deleted: z.boolean().describe('Whether Instagram confirmed the deletion. False when the provider rejects the request.'),
        error: ErrorOutputSchema.optional().describe('Provider error details when the deletion was not accepted.')
    })
    .describe('Result of an Instagram media deletion attempt.');

const HttpErrorSchema = z.object({
    response: z.object({
        data: z.unknown()
    })
});

// Instagram answers DELETE on published media with IGApiException code 100 / subcode 33
// ("Unsupported delete request"); that is the only rejection reported as deleted: false.
const UNSUPPORTED_DELETE_CODE = 100;
const UNSUPPORTED_DELETE_SUBCODE = 33;

function parseProviderError(value: unknown): z.infer<typeof ErrorOutputSchema> | undefined {
    const parsed = ProviderErrorSchema.safeParse(value);

    if (!parsed.success) {
        return undefined;
    }

    const providerError = parsed.data.error;

    return {
        message: providerError.message,
        ...(providerError.type !== undefined && { type: providerError.type }),
        ...(providerError.code !== undefined && { code: providerError.code }),
        ...(providerError.error_subcode !== undefined && { subcode: providerError.error_subcode })
    };
}

function parseUnsupportedDeleteError(responseData: unknown): z.infer<typeof ErrorOutputSchema> | undefined {
    const providerError = parseProviderError(responseData);

    if (providerError?.code === UNSUPPORTED_DELETE_CODE && providerError.subcode === UNSUPPORTED_DELETE_SUBCODE) {
        return providerError;
    }

    return undefined;
}

/**
 * @tags: [write, destructive]
 * @tagReason: Attempts to permanently delete a published Instagram media object from the connected account.
 * @pitfalls: Published media cannot currently be deleted through this flow: Instagram rejects the request as unsupported even though its docs list deletion, so the action returns deleted: false with an error and the media must be removed manually in the Instagram app.
 */
const action = createAction({
    description: 'Attempt to delete a published Instagram media object.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['instagram_business_basic', 'instagram_business_content_publish'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let response;

        // @allowTryCatch - Instagram can reject the documented DELETE as unsupported; report that in the output instead of failing the action.
        try {
            response = await nango.delete({
                // https://developers.facebook.com/docs/instagram-platform/reference/instagram-media
                endpoint: `/${encodeURIComponent(input.mediaId)}`,
                // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
                retries: 0 // Deletion is not idempotent, so retrying a lost response could repeat the mutation.
            });
        } catch (error) {
            const httpError = HttpErrorSchema.safeParse(error);
            const unsupportedDelete = httpError.success ? parseUnsupportedDeleteError(httpError.data.response.data) : undefined;

            // Auth, rate-limit, timeout and 5xx failures must surface so callers can retry them.
            if (unsupportedDelete === undefined) {
                throw error;
            }

            return { mediaId: input.mediaId, deleted: false, error: unsupportedDelete };
        }

        if (response.status >= 400) {
            const unsupportedDelete = parseUnsupportedDeleteError(response.data);

            if (unsupportedDelete === undefined) {
                const providerError = parseProviderError(response.data);

                throw new nango.ActionError({
                    type: 'provider_error',
                    message: providerError?.message ?? `Instagram rejected the media deletion with HTTP ${response.status}.`,
                    status: response.status,
                    ...(providerError !== undefined && { error: providerError })
                });
            }

            return { mediaId: input.mediaId, deleted: false, error: unsupportedDelete };
        }

        return {
            mediaId: input.mediaId,
            deleted: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
