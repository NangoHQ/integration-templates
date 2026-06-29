import { z } from 'zod';
import { createAction } from 'nango';

const TemplateRoleTabSchema = z.object({
    tabLabel: z.string(),
    value: z.string()
});

const TemplateRoleTabsSchema = z.object({
    textTabs: z.array(TemplateRoleTabSchema).optional()
});

const TemplateRoleSchema = z.object({
    roleName: z.string(),
    name: z.string(),
    email: z.string().email(),
    tabs: TemplateRoleTabsSchema.optional()
});

const InputSchema = z.object({
    templateId: z.string().describe('Template ID. Example: "e13866df-36e6-462b-b35b-dcda35982abc"'),
    templateRoles: z.array(TemplateRoleSchema).describe('Role assignments for the template recipients.'),
    status: z.enum(['created', 'sent']).optional().describe('Envelope status. Defaults to "created".'),
    emailSubject: z.string().optional().describe('Email subject for the envelope.'),
    emailBody: z.string().optional().describe('Email body/blurb for the envelope.')
});

const MetadataSchema = z.object({
    accountId: z.string()
});

const ProviderResponseSchema = z.object({
    envelopeId: z.string(),
    uri: z.string().optional(),
    statusDateTime: z.string().optional(),
    status: z.string().optional()
});

const OutputSchema = z.object({
    envelopeId: z.string(),
    uri: z.string().optional(),
    statusDateTime: z.string().optional(),
    status: z.string().optional()
});

const action = createAction({
    description: 'Create an envelope using a template, supplying role assignments and pre-fill data.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['signature'],
    exec: async (nango, input) => {
        const metadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.safeParse(metadata);
        if (!parsedMetadata.success) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'Missing or invalid metadata. accountId is required.'
            });
        }
        const { accountId } = parsedMetadata.data;

        const body: Record<string, unknown> = {
            templateId: input.templateId,
            templateRoles: input.templateRoles.map((role) => ({
                roleName: role.roleName,
                name: role.name,
                email: role.email,
                ...(role.tabs !== undefined && { tabs: role.tabs })
            })),
            status: input.status ?? 'created'
        };

        if (input.emailSubject !== undefined) {
            body['emailSubject'] = input.emailSubject;
        }

        if (input.emailBody !== undefined) {
            body['emailBlurb'] = input.emailBody;
        }

        const response = await nango.post({
            // https://developers.docusign.com/docs/esign-rest-api/reference/envelopes/envelopes/create/
            endpoint: `/restapi/v2.1/accounts/${encodeURIComponent(accountId)}/envelopes`,
            data: body,
            retries: 1
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        return {
            envelopeId: providerResponse.envelopeId,
            ...(providerResponse.uri !== undefined && { uri: providerResponse.uri }),
            ...(providerResponse.statusDateTime !== undefined && { statusDateTime: providerResponse.statusDateTime }),
            ...(providerResponse.status !== undefined && { status: providerResponse.status })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
