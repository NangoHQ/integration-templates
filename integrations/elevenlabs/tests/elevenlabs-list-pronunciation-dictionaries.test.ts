import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-pronunciation-dictionaries.js';

describe('elevenlabs list-pronunciation-dictionaries tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-pronunciation-dictionaries',
        Model: 'ActionOutput_elevenlabs_listpronunciationdictionaries'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
