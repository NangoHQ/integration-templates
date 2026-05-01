import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-inline-comment.js';

describe('confluence update-inline-comment tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-inline-comment',
        Model: 'ActionOutput_confluence_updateinlinecomment'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
