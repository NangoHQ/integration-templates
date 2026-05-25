import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-speech.js';

describe('openai create-speech tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-speech',
        Model: 'ActionOutput_openai_createspeech'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
