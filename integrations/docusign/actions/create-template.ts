import { z } from 'zod';
import { createAction } from 'nango';

const DocumentSchema = z.object({
    documentId: z.string().describe('Document ID. Example: "1"'),
    name: z.string().describe('Document name. Example: "Contract.pdf"'),
    fileExtension: z.string().describe('File extension. Example: "pdf"'),
    documentBase64: z.string().describe('Base64-encoded document content.')
});

const SignerTabSchema = z
    .object({
        tabType: z.string().describe('Tab type. Example: "SignHere"'),
        documentId: z.string().describe('Document ID. Example: "1"'),
        pageNumber: z.string().describe('Page number. Example: "1"'),
        recipientId: z.string().describe('Recipient ID. Example: "1"'),
        xPosition: z.string().describe('X position. Example: "100"'),
        yPosition: z.string().describe('Y position. Example: "100"')
    })
    .passthrough();

const SignerSchema = z.object({
    roleName: z.string().describe('Template role name. Example: "Signer 1"'),
    recipientId: z.string().describe('Recipient ID. Example: "1"'),
    name: z.string().optional().describe('Placeholder name for the role. Example: "Signer One"'),
    tabs: z
        .object({
            signHereTabs: z.array(SignerTabSchema).optional()
        })
        .optional()
});

const InputSchema = z.object({
    name: z.string().describe('Template name. Example: "NDA Template"'),
    emailSubject: z.string().describe('Email subject for envelopes sent from this template. Example: "Please sign the NDA"'),
    emailBlurb: z.string().optional().describe('Email body/blurb.'),
    description: z.string().optional().describe('Template description.'),
    documents: z.array(DocumentSchema).optional().describe('Documents to include in the template.'),
    recipients: z
        .object({
            signers: z.array(SignerSchema).optional()
        })
        .optional()
        .describe('Template recipients with roles.')
});

const ProviderTemplateSummarySchema = z.object({
    templateId: z.string().optional(),
    name: z.string().optional(),
    uri: z.string().optional()
});

const OutputSchema = z.object({
    templateId: z.string().describe('The unique identifier of the created template.'),
    name: z.string().optional().describe('The name of the created template.'),
    uri: z.string().optional().describe('The URI for retrieving the template.')
});

const action = createAction({
    description: 'Create a reusable envelope template with documents, roles, and tabs.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['signature', 'template_read', 'template_write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const MetadataSchema = z.object({ accountId: z.string().min(1) });
        const parsedMetadata = MetadataSchema.safeParse(await nango.getMetadata());
        if (!parsedMetadata.success) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'accountId is required in connection metadata.'
            });
        }
        const accountId = parsedMetadata.data.accountId;

        const body: Record<string, unknown> = {
            status: 'created',
            name: input.name,
            emailSubject: input.emailSubject,
            ...(input.emailBlurb !== undefined && { emailBlurb: input.emailBlurb }),
            ...(input.description !== undefined && { description: input.description })
        };

        if (input.documents !== undefined && input.documents.length > 0) {
            body['documents'] = input.documents;
        }

        if (input.recipients !== undefined) {
            const recipients: Record<string, unknown[]> = {};
            if (input.recipients.signers !== undefined && input.recipients.signers.length > 0) {
                recipients['signers'] = input.recipients.signers.map((signer) => {
                    const signerBody: Record<string, unknown> = {
                        roleName: signer.roleName,
                        recipientId: signer.recipientId,
                        ...(signer.name !== undefined && { name: signer.name })
                    };
                    if (signer.tabs !== undefined) {
                        signerBody['tabs'] = signer.tabs;
                    }
                    return signerBody;
                });
            }
            if (Object.keys(recipients).length > 0) {
                body['recipients'] = recipients;
            }
        }

        // https://developers.docusign.com/docs/esign-rest-api/reference/templates/templates/create/
        const response = await nango.post({
            endpoint: `/restapi/v2.1/accounts/${encodeURIComponent(accountId)}/templates`,
            data: body,
            retries: 3
        });

        const providerSummary = ProviderTemplateSummarySchema.parse(response.data);

        if (!providerSummary.templateId) {
            throw new nango.ActionError({
                type: 'missing_template_id',
                message: 'Template was created but the response did not include a templateId.'
            });
        }

        return {
            templateId: providerSummary.templateId,
            ...(providerSummary.name !== undefined && { name: providerSummary.name }),
            ...(providerSummary.uri !== undefined && { uri: providerSummary.uri })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
