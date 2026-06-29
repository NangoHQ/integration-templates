import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-user-subscription.js';

describe('elevenlabs get-user-subscription tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-user-subscription',
        Model: 'ActionOutput_elevenlabs_getusersubscription'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
