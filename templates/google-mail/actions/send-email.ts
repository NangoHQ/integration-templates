import { createAction } from "nango";
import { GmailEmailSentOutput, GmailEmailInput } from "../models.js";

const action = createAction({
    description: "Send an Email using Gmail.",
    version: "1.0.1",

    endpoint: {
        method: "POST",
        path: "/emails",
        group: "Emails"
    },

    input: GmailEmailInput,
    output: GmailEmailSentOutput,
    scopes: ["https://www.googleapis.com/auth/gmail.send"],

    exec: async (nango, input): Promise<GmailEmailSentOutput> => {
        let headerString = '';

        if (input.headers)
            Object.entries(input.headers).forEach(([key, value]) => {
                headerString += `${key}: ${value}\n`;
            });

        const email = `From: ${input.from}\nTo: ${input.to}\n${headerString}Subject: ${input.subject}\n\n${input.body}`;

        const base64EncodedEmail = Buffer.from(email).toString('base64');

        // send the email using nango proxy
        const sentEmailResponse = await nango.proxy({
            method: 'POST',
            endpoint: '/gmail/v1/users/me/messages/send',
            data: {
                raw: base64EncodedEmail
            },
            retries: 3
        });

        return mapEmail(sentEmailResponse.data);
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;

function mapEmail(record: any): GmailEmailSentOutput {
    return {
        id: record.id,
        threadId: record.threadId
    };
}
