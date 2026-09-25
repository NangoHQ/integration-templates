import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-user-activity.js';

describe('amplitude get-user-activity tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-user-activity',
        Model: 'ActionOutput_amplitude_getuseractivity'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });

    it('should reject non-numeric user identifiers before calling the API', async () => {
        class ActionError extends Error {
            constructor(public payload: Record<string, unknown>) {
                super(String(payload['message']));
                this.name = 'ActionError';
            }
        }

        const get = vi.fn();
        const nango = {
            ActionError,
            get,
            getConnection: vi.fn().mockResolvedValue({ connection_config: {} })
        };

        await expect(createAction.exec(nango as any, { user: 'nango_test_user' })).rejects.toThrow(/numeric Amplitude ID/);
        expect(get).not.toHaveBeenCalled();
    });
});
