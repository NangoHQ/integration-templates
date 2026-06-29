import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-knowledge-base.js';

describe('elevenlabs list-knowledge-base tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-knowledge-base',
        Model: 'ActionOutput_elevenlabs_listknowledgebase'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
