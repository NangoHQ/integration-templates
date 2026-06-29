import { createAction, ProxyConfiguration } from 'nango';
import { z } from 'zod';

const InputSchema = z.object({
    envelopeId: z.string().describe('Envelope ID. Example: "ffbe2429-fc88-8ef2-803e-8ad9296118b6"'),
    recipientId: z.string().describe('Recipient ID. Example: "1"')
});

const MetadataSchema = z.object({
    accountId: z.string().describe('DocuSign account ID from connection metadata.')
});

const TabSchema = z
    .object({
        tabId: z.string().optional(),
        documentId: z.string().optional(),
        recipientId: z.string().optional(),
        pageNumber: z.string().optional(),
        xPosition: z.string().optional(),
        yPosition: z.string().optional(),
        tabLabel: z.string().optional(),
        name: z.string().optional(),
        value: z.string().optional(),
        locked: z.string().optional(),
        required: z.string().optional(),
        selected: z.string().optional()
    })
    .passthrough();

const OutputSchema = z
    .object({
        signHereTabs: z.array(TabSchema).optional(),
        initialHereTabs: z.array(TabSchema).optional(),
        dateSignedTabs: z.array(TabSchema).optional(),
        textTabs: z.array(TabSchema).optional(),
        checkboxTabs: z.array(TabSchema).optional(),
        radioGroupTabs: z.array(TabSchema).optional(),
        listTabs: z.array(TabSchema).optional(),
        numberTabs: z.array(TabSchema).optional(),
        ssnTabs: z.array(TabSchema).optional(),
        zipTabs: z.array(TabSchema).optional(),
        noteTabs: z.array(TabSchema).optional(),
        approveTabs: z.array(TabSchema).optional(),
        declineTabs: z.array(TabSchema).optional(),
        formulaTabs: z.array(TabSchema).optional(),
        titleTabs: z.array(TabSchema).optional(),
        fullNameTabs: z.array(TabSchema).optional(),
        emailTabs: z.array(TabSchema).optional(),
        companyTabs: z.array(TabSchema).optional(),
        dateTabs: z.array(TabSchema).optional(),
        envelopeIdTabs: z.array(TabSchema).optional(),
        firstNameTabs: z.array(TabSchema).optional(),
        lastNameTabs: z.array(TabSchema).optional()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve all tabs for a specific recipient in an envelope.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: [],
    endpoint: {
        method: 'GET',
        path: '/actions/list-recipient-tabs'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const metadataResult = MetadataSchema.safeParse(metadata);

        if (!metadataResult.success) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'accountId is required in connection metadata.'
            });
        }

        const accountId = metadataResult.data.accountId;

        const config: ProxyConfiguration = {
            // https://developers.docusign.com/docs/esign-rest-api/reference/envelopes/enveloperecipienttabs/get/
            endpoint: `/restapi/v2.1/accounts/${encodeURIComponent(accountId)}/envelopes/${encodeURIComponent(input.envelopeId)}/recipients/${encodeURIComponent(input.recipientId)}/tabs`,
            retries: 3
        };
        const response = await nango.get(config);

        const tabs = OutputSchema.parse(response.data);
        return tabs;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
