import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-agent.js';

describe('elevenlabs delete-agent tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-agent',
        Model: 'ActionOutput_elevenlabs_deleteagent'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
