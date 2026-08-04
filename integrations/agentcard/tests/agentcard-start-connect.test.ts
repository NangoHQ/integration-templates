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
});
