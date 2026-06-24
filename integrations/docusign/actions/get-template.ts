import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    templateId: z.string().describe('Template ID. Example: "e13866df-36e6-462b-b35b-dcda35982abc"')
});

const DocumentSchema = z.object({
    documentId: z.string().optional(),
    name: z.string().optional(),
    type: z.string().optional(),
    uri: z.string().optional()
});

const TabSchema = z.object({
    tabId: z.string().optional(),
    tabLabel: z.string().optional(),
    type: z.string().optional()
});

const TabsSchema = z.object({
    signHereTabs: z.array(TabSchema).optional(),
    dateSignedTabs: z.array(TabSchema).optional(),
    textTabs: z.array(TabSchema).optional(),
    checkboxTabs: z.array(TabSchema).optional(),
    radioGroupTabs: z.array(TabSchema).optional()
});

const RecipientSchema = z.object({
    recipientId: z.string().optional(),
    recipientIdGuid: z.string().optional(),
    roleName: z.string().optional(),
    name: z.string().optional(),
    email: z.string().optional(),
    tabs: TabsSchema.optional()
});

const RecipientsSchema = z.object({
    signers: z.array(RecipientSchema).optional(),
    carbonCopies: z.array(RecipientSchema).optional(),
    certifiedDeliveries: z.array(RecipientSchema).optional(),
    editors: z.array(RecipientSchema).optional(),
    intermediaries: z.array(RecipientSchema).optional()
});

const OutputSchema = z.object({
    templateId: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    emailSubject: z.string().optional(),
    emailBlurb: z.string().optional(),
    status: z.string().optional(),
    documents: z.array(DocumentSchema).optional(),
    recipients: RecipientsSchema.optional()
});

const action = createAction({
    description: 'Retrieve a template by ID including documents, recipients, and tabs.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    endpoint: {
        path: '/actions/get-template',
        method: 'GET'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const metadataSchema = z
            .object({
                accountId: z.string().optional()
            })
            .nullish();
        const parsedMetadata = metadataSchema.parse(metadata);
        const accountId = parsedMetadata?.accountId;

        if (typeof accountId !== 'string' || !accountId) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'accountId is required in connection metadata.'
            });
        }

        // https://developers.docusign.com/docs/esign-rest-api/reference/templates/templates/get/
        const response = await nango.get({
            endpoint: `/restapi/v2.1/accounts/${encodeURIComponent(accountId)}/templates/${encodeURIComponent(input.templateId)}`,
            params: {
                include: 'documents,recipients'
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Template not found',
                templateId: input.templateId
            });
        }

        const providerTemplate = z
            .object({
                templateId: z.string(),
                name: z.string().optional(),
                description: z.string().optional(),
                emailSubject: z.string().optional(),
                emailBlurb: z.string().optional(),
                status: z.string().optional(),
                documents: z.array(DocumentSchema).optional(),
                recipients: RecipientsSchema.optional()
            })
            .parse(response.data);

        return {
            templateId: providerTemplate.templateId,
            ...(providerTemplate.name !== undefined && { name: providerTemplate.name }),
            ...(providerTemplate.description !== undefined && { description: providerTemplate.description }),
            ...(providerTemplate.emailSubject !== undefined && { emailSubject: providerTemplate.emailSubject }),
            ...(providerTemplate.emailBlurb !== undefined && { emailBlurb: providerTemplate.emailBlurb }),
            ...(providerTemplate.status !== undefined && { status: providerTemplate.status }),
            ...(providerTemplate.documents !== undefined && { documents: providerTemplate.documents }),
            ...(providerTemplate.recipients !== undefined && { recipients: providerTemplate.recipients })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
