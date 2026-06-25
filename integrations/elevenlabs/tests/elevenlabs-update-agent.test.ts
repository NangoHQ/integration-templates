import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-agent.js';

describe('elevenlabs update-agent tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-agent',
        Model: 'ActionOutput_elevenlabs_updateagent'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
