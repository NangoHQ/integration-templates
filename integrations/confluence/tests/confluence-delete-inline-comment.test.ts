import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-inline-comment.js';

describe('confluence delete-inline-comment tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-inline-comment',
        Model: 'ActionOutput_confluence_deleteinlinecomment'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
