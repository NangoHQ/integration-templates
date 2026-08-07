import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/verify-connect.js';

describe('agentcard verify-connect tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'verify-connect',
        Model: 'ActionOutput_agentcard_verifyconnect'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
