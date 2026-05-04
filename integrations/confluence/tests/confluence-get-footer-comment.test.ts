import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-footer-comment.js';

describe('confluence get-footer-comment tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-footer-comment',
        Model: 'ActionOutput_confluence_getfootercomment'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
