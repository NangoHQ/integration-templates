import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/add-pronunciation-dictionary-rules.js';

describe('elevenlabs add-pronunciation-dictionary-rules tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'add-pronunciation-dictionary-rules',
        Model: 'ActionOutput_elevenlabs_addpronunciationdictionaryrules'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
