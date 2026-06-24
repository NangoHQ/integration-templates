import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    folderId: z.string().describe('Folder ID. Example: "b97b86fd-ca82-47d7-8435-f11555c52d0e"'),
    cursor: z.string().optional().describe('Pagination cursor (start_position) from the previous response. Omit for the first page.'),
    count: z.number().optional().describe('Number of results to return per page. Default: 50.')
});

const EnvelopeSchema = z.object({
    envelopeId: z.string(),
    status: z.string().optional(),
    emailSubject: z.string().optional(),
    emailBlurb: z.string().optional(),
    sentDateTime: z.string().optional(),
    createdDateTime: z.string().optional(),
    statusChangedDateTime: z.string().optional(),
    sender: z
        .object({
            userName: z.string().optional(),
            userId: z.string().optional(),
            email: z.string().optional()
        })
        .optional()
});

const ProviderListSchema = z.object({
    resultSetSize: z.string().optional(),
    totalSetSize: z.string().optional(),
    startPosition: z.string().optional(),
    endPosition: z.string().optional(),
    nextUri: z.string().optional(),
    previousUri: z.string().optional(),
    envelopes: z.array(z.unknown()).optional()
});

const OutputSchema = z.object({
    items: z.array(
        z.object({
            envelopeId: z.string(),
            status: z.string().optional(),
            emailSubject: z.string().optional(),
            emailBlurb: z.string().optional(),
            sentDateTime: z.string().optional(),
            createdDateTime: z.string().optional(),
            statusChangedDateTime: z.string().optional(),
            sender: z
                .object({
                    userName: z.string().optional(),
                    userId: z.string().optional(),
                    email: z.string().optional()
                })
                .optional()
        })
    ),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List envelopes contained in a specific folder.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['signature'],
    endpoint: {
        method: 'POST',
        path: '/actions/list-folder-envelopes'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata<{ accountId?: string }>();
        const accountId = metadata?.accountId;

        if (!accountId) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'accountId is required in connection metadata.'
            });
        }

        const count = input.count ?? 50;

        const response = await nango.get({
            // https://developers.docusign.com/docs/esign-rest-api/reference/envelopes/envelopes/liststatuschanges/
            endpoint: `/restapi/v2.1/accounts/${encodeURIComponent(accountId)}/envelopes`,
            params: {
                folder_ids: input.folderId,
                from_date: '2000-01-01',
                ...(input.cursor !== undefined && { start_position: input.cursor }),
                count: String(count)
            },
            retries: 3
        });

        const providerList = ProviderListSchema.parse(response.data);
        const envelopes = providerList.envelopes ?? [];
        const items = envelopes.map((envelope) => {
            const parsed = EnvelopeSchema.safeParse(envelope);
            if (!parsed.success) {
                const fallback = z.object({ envelopeId: z.unknown() }).passthrough().safeParse(envelope);
                const envelopeId = fallback.success && typeof fallback.data['envelopeId'] === 'string' ? fallback.data['envelopeId'] : '';
                return {
                    envelopeId
                };
            }
            return {
                envelopeId: parsed.data.envelopeId,
                ...(parsed.data.status !== undefined && { status: parsed.data.status }),
                ...(parsed.data.emailSubject !== undefined && { emailSubject: parsed.data.emailSubject }),
                ...(parsed.data.emailBlurb !== undefined && { emailBlurb: parsed.data.emailBlurb }),
                ...(parsed.data.sentDateTime !== undefined && { sentDateTime: parsed.data.sentDateTime }),
                ...(parsed.data.createdDateTime !== undefined && { createdDateTime: parsed.data.createdDateTime }),
                ...(parsed.data.statusChangedDateTime !== undefined && { statusChangedDateTime: parsed.data.statusChangedDateTime }),
                ...(parsed.data.sender !== undefined && { sender: parsed.data.sender })
            };
        });

        let next_cursor: string | undefined;
        if (providerList.nextUri) {
            const match = providerList.nextUri.match(/[?&]start_position=([^&]+)/);
            if (match && match[1]) {
                next_cursor = decodeURIComponent(match[1]);
            }
        }

        return {
            items,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
