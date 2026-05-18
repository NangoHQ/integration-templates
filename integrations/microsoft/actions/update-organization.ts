import { z } from 'zod';
import { createAction } from 'nango';

const PrivacyProfileSchema = z.object({
    contactEmail: z.string().optional().describe('Contact email for privacy issues.'),
    statementUrl: z.string().optional().describe('URL to the privacy statement.')
});

const InputSchema = z.object({
    id: z.string().describe('The unique identifier of the organization.'),
    marketingNotificationEmails: z.array(z.string()).optional().describe('Email addresses for marketing notifications.'),
    privacyProfile: PrivacyProfileSchema.optional().describe('Privacy profile with contact email and statement URL.'),
    securityComplianceNotificationMails: z.array(z.string()).optional().describe('Email addresses for security compliance notifications.'),
    securityComplianceNotificationPhones: z.array(z.string()).optional().describe('Phone numbers for security compliance notifications.'),
    technicalNotificationMails: z.array(z.string()).optional().describe('Email addresses for technical notifications.')
});

const OutputSchema = z.object({
    success: z.boolean().describe('Whether the update was successful.')
});

const action = createAction({
    description: 'Update the properties of a Microsoft organization.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-organization',
        group: 'Organizations'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Organization.ReadWrite.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, unknown> = {};

        if (input.marketingNotificationEmails !== undefined) {
            data['marketingNotificationEmails'] = input.marketingNotificationEmails;
        }

        if (input.privacyProfile !== undefined) {
            data['privacyProfile'] = input.privacyProfile;
        }

        if (input.securityComplianceNotificationMails !== undefined) {
            data['securityComplianceNotificationMails'] = input.securityComplianceNotificationMails;
        }

        if (input.securityComplianceNotificationPhones !== undefined) {
            data['securityComplianceNotificationPhones'] = input.securityComplianceNotificationPhones;
        }

        if (input.technicalNotificationMails !== undefined) {
            data['technicalNotificationMails'] = input.technicalNotificationMails;
        }

        // https://learn.microsoft.com/en-us/graph/api/organization-update
        await nango.patch({
            endpoint: `/v1.0/organization/${encodeURIComponent(input.id)}`,
            data,
            retries: 3
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
