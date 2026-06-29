import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-pronunciation-dictionary.js';

describe('elevenlabs get-pronunciation-dictionary tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-pronunciation-dictionary',
        Model: 'ActionOutput_elevenlabs_getpronunciationdictionary'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
