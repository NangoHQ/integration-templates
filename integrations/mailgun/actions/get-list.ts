import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        address: z.string().describe('The mailing list address to retrieve. Example: "dev@samples.mailgun.org"')
    })
    .describe('Input for retrieving a single mailing list');

const OutputSchema = z
    .object({
        address: z.string().describe('The email address of the mailing list. Example: "dev@samples.mailgun.org"'),
        name: z.string().optional().describe('The name of the mailing list. Example: "Developers"'),
        description: z.string().optional().describe('A description of the mailing list. Example: "Mailgun developers list"'),
        access_level: z.string().describe('List access level, one of: readonly, members, everyone. Example: "readonly"'),
        reply_preference: z.string().optional().describe('Where replies should go, one of: list, sender. Example: "list"'),
        created_at: z.string().describe('Timestamp indicating the mailing list creation time in RFC 5322 format. Example: "Tue, 26 Feb 2019 22:13:59 -0000"'),
        members_count: z.number().describe('The number of members on the mailing list. Example: 3')
    })
    .describe('The retrieved mailing list');

const HttpErrorSchema = z.object({
    response: z.object({
        status: z.number(),
        data: z.unknown().optional()
    })
});

const ProviderErrorSchema = z.object({
    message: z.string()
});

const ProviderListResponseSchema = z.object({
    list: z.object({
        address: z.string(),
        name: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        access_level: z.string(),
        reply_preference: z.string().nullable().optional(),
        created_at: z.string(),
        members_count: z.number()
    })
});

/**
 * @tags: [read]
 * @tagReason: Performs a single GET request to fetch one mailing list; no provider-side mutations.
 * @pitfalls: A nonexistent list address throws a typed not_found error instead of returning null, so callers must handle the thrown error.
 */
const action = createAction({
    description: 'Retrieve a single mailing list by its address',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let response;
        // @allowTryCatch: Mailgun returns 404 when the list address does not exist; map it to a typed not_found error for the caller.
        try {
            // https://documentation.mailgun.com/docs/mailgun/api-reference/send/mailgun/mailing-lists/get-v3-lists-address.md
            response = await nango.get({
                endpoint: `/v3/lists/${encodeURIComponent(input.address)}`,
                retries: 3
            });
        } catch (err: unknown) {
            const httpError = HttpErrorSchema.safeParse(err);
            if (httpError.success && httpError.data.response.status === 404) {
                const providerError = ProviderErrorSchema.safeParse(httpError.data.response.data);
                throw new nango.ActionError({
                    type: 'not_found',
                    message: providerError.success ? providerError.data.message : `Mailing list not found`,
                    address: input.address
                });
            }
            throw err;
        }

        const list = ProviderListResponseSchema.parse(response.data).list;

        return {
            address: list.address,
            access_level: list.access_level,
            created_at: list.created_at,
            members_count: list.members_count,
            ...(list.name != null && { name: list.name }),
            ...(list.description != null && { description: list.description }),
            ...(list.reply_preference != null && { reply_preference: list.reply_preference })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
