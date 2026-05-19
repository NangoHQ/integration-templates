import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-transcription.js';

describe('openai create-transcription tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-transcription',
        Model: 'ActionOutput_openai_createtranscription'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
