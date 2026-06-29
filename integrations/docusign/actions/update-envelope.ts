import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    envelopeId: z.string().describe('DocuSign envelope ID. Example: "ffbe2429-fc88-8ef2-803e-8ad9296118b6"'),
    emailSubject: z.string().optional().describe('Updated email subject for the envelope.'),
    emailBlurb: z.string().optional().describe('Updated email body/message for the envelope.'),
    notification: z
        .object({
            expirations: z
                .object({
                    expireEnabled: z.string().optional().describe('"true" or "false"'),
                    expireAfter: z.string().optional().describe('Number of days after which the envelope expires.')
                })
                .optional(),
            reminders: z
                .object({
                    reminderEnabled: z.string().optional().describe('"true" or "false"'),
                    reminderDelay: z.string().optional().describe('Days before first reminder.'),
                    reminderFrequency: z.string().optional().describe('Days between reminders.')
                })
                .optional()
        })
        .optional()
        .describe('Notification settings for the envelope.')
});

const ProviderEnvelopeSchema = z.object({
    envelopeId: z.string().optional(),
    status: z.string().optional(),
    emailSubject: z.string().optional(),
    emailBlurb: z.string().optional(),
    notification: z
        .object({
            expirations: z
                .object({
                    expireEnabled: z.string().optional(),
                    expireAfter: z.string().optional()
                })
                .optional(),
            reminders: z
                .object({
                    reminderEnabled: z.string().optional(),
                    reminderDelay: z.string().optional(),
                    reminderFrequency: z.string().optional()
                })
                .optional()
        })
        .optional()
});

const OutputSchema = z.object({
    envelopeId: z.string().optional(),
    status: z.string().optional(),
    emailSubject: z.string().optional(),
    emailBlurb: z.string().optional(),
    notification: z
        .object({
            expirations: z
                .object({
                    expireEnabled: z.string().optional(),
                    expireAfter: z.string().optional()
                })
                .optional(),
            reminders: z
                .object({
                    reminderEnabled: z.string().optional(),
                    reminderDelay: z.string().optional(),
                    reminderFrequency: z.string().optional()
                })
                .optional()
        })
        .optional()
});

const action = createAction({
    description: "Update a draft envelope's fields (subject, email body, expiration, etc.).",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const metadataSchema = z.object({
            accountId: z.string().optional()
        });
        const parsedMetadata = metadataSchema.safeParse(metadata);
        const accountId = parsedMetadata.success ? parsedMetadata.data.accountId : undefined;

        if (!accountId) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'accountId is required in connection metadata.'
            });
        }

        const body: Record<string, unknown> = {};
        if (input.emailSubject !== undefined) {
            body['emailSubject'] = input.emailSubject;
        }
        if (input.emailBlurb !== undefined) {
            body['emailBlurb'] = input.emailBlurb;
        }
        if (input.notification !== undefined) {
            body['notification'] = input.notification;
        }

        const response = await nango.put({
            // https://developers.docusign.com/docs/esign-rest-api/reference/envelopes/envelopes/update/
            endpoint: `/restapi/v2.1/accounts/${encodeURIComponent(accountId)}/envelopes/${encodeURIComponent(input.envelopeId)}`,
            data: body,
            retries: 3
        });

        const providerEnvelope = ProviderEnvelopeSchema.parse(response.data);

        return {
            ...(providerEnvelope.envelopeId !== undefined && { envelopeId: providerEnvelope.envelopeId }),
            ...(providerEnvelope.status !== undefined && { status: providerEnvelope.status }),
            ...(providerEnvelope.emailSubject !== undefined && { emailSubject: providerEnvelope.emailSubject }),
            ...(providerEnvelope.emailBlurb !== undefined && { emailBlurb: providerEnvelope.emailBlurb }),
            ...(providerEnvelope.notification !== undefined && { notification: providerEnvelope.notification })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
