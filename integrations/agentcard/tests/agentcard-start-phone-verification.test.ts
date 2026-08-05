import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/start-phone-verification.js';

describe('agentcard start-phone-verification tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'start-phone-verification',
        Model: 'ActionOutput_agentcard_startphoneverification'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
