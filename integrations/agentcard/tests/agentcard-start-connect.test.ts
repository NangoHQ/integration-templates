import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/start-connect.js';

describe('agentcard start-connect tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'start-connect',
        Model: 'ActionOutput_agentcard_startconnect'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });

    it('should send a code by phone when only phone is provided', async () => {
        vi.spyOn(nangoMock, 'post').mockResolvedValueOnce({
            data: {
                object: 'connect_attempt',
                id: 'cmsg00vak000vkv0487lb9dew',
                channel: 'phone',
                expires_at: '2026-08-05T11:33:34.883Z'
            }
        } as Awaited<ReturnType<typeof nangoMock.post>>);

        const response = await createAction.exec(nangoMock, { phone: '+14155550123' });

        expect(response).toEqual({
            object: 'connect_attempt',
            id: 'cmsg00vak000vkv0487lb9dew',
            channel: 'phone',
            expires_at: '2026-08-05T11:33:34.883Z'
        });
    });

    it('should reject when neither email nor phone is provided', async () => {
        await expect(createAction.exec(nangoMock, {})).rejects.toMatchObject({
            payload: { type: 'invalid_input', message: 'Provide exactly one of email or phone.' }
        });
    });

    it('should reject when both email and phone are provided', async () => {
        await expect(createAction.exec(nangoMock, { email: 'a@example.com', phone: '+14155550123' })).rejects.toMatchObject({
            payload: { type: 'invalid_input', message: 'Provide exactly one of email or phone.' }
        });
    });
});
