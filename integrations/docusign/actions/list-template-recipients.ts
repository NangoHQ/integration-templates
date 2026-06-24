import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    templateId: z.string().describe('Template ID. Example: "e13866df-36e6-462b-b35b-dcda35982abc"')
});

const ProviderRecipientSchema = z
    .object({
        recipientId: z.string().optional(),
        roleName: z.string().optional(),
        name: z.string().optional(),
        email: z.string().optional()
    })
    .passthrough();

const ProviderRecipientsResponseSchema = z
    .object({
        signers: z.array(ProviderRecipientSchema).optional(),
        carbonCopies: z.array(ProviderRecipientSchema).optional(),
        certifiedDeliveries: z.array(ProviderRecipientSchema).optional(),
        inPersonSigners: z.array(ProviderRecipientSchema).optional(),
        intermediaries: z.array(ProviderRecipientSchema).optional(),
        editors: z.array(ProviderRecipientSchema).optional(),
        agents: z.array(ProviderRecipientSchema).optional(),
        seals: z.array(ProviderRecipientSchema).optional(),
        witnesses: z.array(ProviderRecipientSchema).optional()
    })
    .passthrough();

const RecipientSchema = z.object({
    recipientId: z.string().optional().describe('The recipient ID'),
    roleName: z.string().optional().describe('The role name of the recipient'),
    name: z.string().optional().describe('The name of the recipient'),
    email: z.string().optional().describe('The email of the recipient'),
    recipientType: z.string().describe('The type of recipient (e.g., signer, carbonCopy)')
});

const OutputSchema = z.object({
    recipients: z.array(RecipientSchema).describe('List of recipient roles defined in the template')
});

const MetadataSchema = z.object({
    accountId: z.string().optional()
});

const action = createAction({
    description: 'List recipient roles defined in a template',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    endpoint: {
        path: '/actions/list-template-recipients',
        method: 'GET'
    },
    scopes: [],

    exec: async (nango, input) => {
        const metadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.safeParse(metadata);

        if (!parsedMetadata.success || !parsedMetadata.data.accountId) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'accountId is required in connection metadata.'
            });
        }

        const accountId = parsedMetadata.data.accountId;

        // https://developers.docusign.com/docs/esign-rest-api/reference/templates/templaterecipients/list/
        const response = await nango.get({
            endpoint: `/restapi/v2.1/accounts/${encodeURIComponent(accountId)}/templates/${encodeURIComponent(input.templateId)}/recipients`,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from DocuSign API.'
            });
        }

        const providerRecipients = ProviderRecipientsResponseSchema.parse(response.data);

        const recipientTypes = [
            'signers',
            'carbonCopies',
            'certifiedDeliveries',
            'inPersonSigners',
            'intermediaries',
            'editors',
            'agents',
            'seals',
            'witnesses'
        ];

        const recipients = [];

        for (const type of recipientTypes) {
            const list = providerRecipients[type];
            if (Array.isArray(list)) {
                for (const item of list) {
                    recipients.push({
                        ...(item.recipientId !== undefined && { recipientId: item.recipientId }),
                        ...(item.roleName !== undefined && { roleName: item.roleName }),
                        ...(item.name !== undefined && { name: item.name }),
                        ...(item.email !== undefined && { email: item.email }),
                        recipientType: type
                    });
                }
            }
        }

        return {
            recipients
        };
    }
});

export default action;
