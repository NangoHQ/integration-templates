import { z } from 'zod';
import { createAction } from 'nango';

const TabInputSchema = z
    .object({
        documentId: z.string(),
        pageNumber: z.string(),
        xPosition: z.string(),
        yPosition: z.string()
    })
    .passthrough();

const InputSchema = z.object({
    envelopeId: z.string().describe('DocuSign envelope ID. Example: "ffbe2429-fc88-8ef2-803e-8ad9296118b6"'),
    recipientId: z.string().describe('DocuSign recipient ID (integer string). Example: "1"'),
    tabs: z
        .object({
            signHereTabs: z.array(TabInputSchema).optional(),
            dateTabs: z.array(TabInputSchema).optional(),
            textTabs: z.array(TabInputSchema).optional(),
            checkboxTabs: z.array(TabInputSchema).optional(),
            numberTabs: z.array(TabInputSchema).optional(),
            initialHereTabs: z.array(TabInputSchema).optional()
        })
        .passthrough()
});

const OutputSchema = z
    .object({
        signHereTabs: z.array(z.object({}).passthrough()).optional(),
        dateTabs: z.array(z.object({}).passthrough()).optional(),
        textTabs: z.array(z.object({}).passthrough()).optional(),
        checkboxTabs: z.array(z.object({}).passthrough()).optional(),
        numberTabs: z.array(z.object({}).passthrough()).optional(),
        initialHereTabs: z.array(z.object({}).passthrough()).optional()
    })
    .passthrough();

const action = createAction({
    description: 'Add signature, date, text, checkbox and other tabs to a recipient on a draft envelope.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    endpoint: {
        method: 'POST',
        path: '/actions/create-recipient-tabs'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const metadataSchema = z.object({
            accountId: z.string()
        });
        const parsedMetadata = metadataSchema.safeParse(metadata);
        if (!parsedMetadata.success) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'accountId is required in connection metadata.'
            });
        }

        const accountId = parsedMetadata.data.accountId;

        // https://developers.docusign.com/docs/esign-rest-api/reference/envelopes/enveloperecipienttabs/create/
        const response = await nango.post({
            endpoint: `/restapi/v2.1/accounts/${encodeURIComponent(accountId)}/envelopes/${encodeURIComponent(input.envelopeId)}/recipients/${encodeURIComponent(input.recipientId)}/tabs`,
            data: input.tabs,
            retries: 3
        });

        const responseSchema = OutputSchema;
        const parsedResponse = responseSchema.safeParse(response.data);
        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to parse DocuSign recipient tabs response.',
                details: parsedResponse.error.message
            });
        }

        return parsedResponse.data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
