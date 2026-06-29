import { z } from 'zod';
import { createAction } from 'nango';

const TabItemSchema = z.record(z.string(), z.unknown());

const TabsSchema = z
    .object({
        textTabs: z.array(TabItemSchema).optional(),
        signHereTabs: z.array(TabItemSchema).optional(),
        dateSignedTabs: z.array(TabItemSchema).optional(),
        initialHereTabs: z.array(TabItemSchema).optional(),
        checkboxTabs: z.array(TabItemSchema).optional(),
        radioGroupTabs: z.array(TabItemSchema).optional(),
        listTabs: z.array(TabItemSchema).optional(),
        noteTabs: z.array(TabItemSchema).optional(),
        approveTabs: z.array(TabItemSchema).optional(),
        declineTabs: z.array(TabItemSchema).optional(),
        numberTabs: z.array(TabItemSchema).optional(),
        formulaTabs: z.array(TabItemSchema).optional(),
        titleTabs: z.array(TabItemSchema).optional(),
        companyTabs: z.array(TabItemSchema).optional(),
        fullNameTabs: z.array(TabItemSchema).optional(),
        emailTabs: z.array(TabItemSchema).optional(),
        envelopeIdTabs: z.array(TabItemSchema).optional(),
        ssnTabs: z.array(TabItemSchema).optional(),
        zipTabs: z.array(TabItemSchema).optional()
    })
    .passthrough();

const InputSchema = z.object({
    envelopeId: z.string().describe('DocuSign envelope ID. Example: "ffbe2429-fc88-8ef2-803e-8ad9296118b6"'),
    recipientId: z.string().describe('DocuSign recipient ID (integer string). Example: "1"'),
    tabs: TabsSchema.describe('Tabs payload to update or create on the recipient.')
});

const MetadataSchema = z.object({
    accountId: z.string().optional()
});

const OutputSchema = z
    .object({
        textTabs: z.array(TabItemSchema).optional(),
        signHereTabs: z.array(TabItemSchema).optional(),
        dateSignedTabs: z.array(TabItemSchema).optional(),
        initialHereTabs: z.array(TabItemSchema).optional(),
        checkboxTabs: z.array(TabItemSchema).optional(),
        radioGroupTabs: z.array(TabItemSchema).optional(),
        listTabs: z.array(TabItemSchema).optional(),
        noteTabs: z.array(TabItemSchema).optional(),
        approveTabs: z.array(TabItemSchema).optional(),
        declineTabs: z.array(TabItemSchema).optional(),
        numberTabs: z.array(TabItemSchema).optional(),
        formulaTabs: z.array(TabItemSchema).optional(),
        titleTabs: z.array(TabItemSchema).optional(),
        companyTabs: z.array(TabItemSchema).optional(),
        fullNameTabs: z.array(TabItemSchema).optional(),
        emailTabs: z.array(TabItemSchema).optional(),
        envelopeIdTabs: z.array(TabItemSchema).optional(),
        ssnTabs: z.array(TabItemSchema).optional(),
        zipTabs: z.array(TabItemSchema).optional()
    })
    .passthrough();

const action = createAction({
    description: 'Update tabs on a recipient in a draft envelope.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['signature'],
    endpoint: {
        method: 'POST',
        path: '/actions/update-recipient-tabs'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const accountId = typeof metadata?.accountId === 'string' ? metadata.accountId : undefined;

        if (!accountId) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'accountId is required in connection metadata.'
            });
        }

        // https://developers.docusign.com/docs/esign-rest-api/reference/envelopes/enveloperecipienttabs/update/
        const response = await nango.put({
            endpoint: `/restapi/v2.1/accounts/${encodeURIComponent(accountId)}/envelopes/${encodeURIComponent(input.envelopeId)}/recipients/${encodeURIComponent(input.recipientId)}/tabs`,
            data: input.tabs,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from DocuSign API.'
            });
        }

        const providerTabs = OutputSchema.parse(response.data);
        return providerTabs;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
