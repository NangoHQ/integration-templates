import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-knowledge-base-document.js';

describe('elevenlabs delete-knowledge-base-document tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-knowledge-base-document',
        Model: 'ActionOutput_elevenlabs_deleteknowledgebasedocument'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
