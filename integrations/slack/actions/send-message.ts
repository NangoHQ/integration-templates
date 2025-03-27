import type { NangoAction, SendMessageInput, SendMessageOutput, ProxyConfiguration } from '../../models';
import { toMessage } from '../mappers/to-message.js';

/**
 * This function handles sending a message to a Slack channel via the Nango action.
 * It validates the input message data, maps it to the appropriate Slack message structure,
 * and sends a request to post the message in the specified Slack channel.
 *
 * @param {NangoAction} nango - The Nango action instance to handle API requests.
 * @param {SendMessageInput} input - The message data input that will be sent to Slack.
 * @throws {nango.ActionError} - Throws an error if the input is missing or lacks required fields.
 * @returns {Promise<SendMessageOutput>} - Returns the response object representing the status of the sent message.
 */
export default async function runAction(nango: NangoAction, input: SendMessageInput): Promise<SendMessageOutput> {
    // Validate if input is present
    if (!input) {
        throw new nango.ActionError({
            message: `Input message object is required. Received: ${JSON.stringify(input)}`
        });
    }

    // Ensure that the required fields are present to send a message to a Slack channel
    if (!input.channel || !input.text) {
        throw new nango.ActionError({
            message: `Please provide a 'channel' and 'text' for the message. Received: ${JSON.stringify(input)}`
        });
    }

    const slackMessage = {
        channel: input.channel,
        text: input.text
    };

    const config: ProxyConfiguration = {
        // https://api.slack.com/methods/chat.postMessage
        endpoint: '/chat.postMessage',
        data: slackMessage,
        headers: {
            'Content-Type': 'application/json; charset=utf-8'
        },
        retries: 3
    };

    //https://api.slack.com/methods/chat.postMessage
    const response = await nango.post(config);

    return toMessage(response.data);
}
