import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-footer-comment.js';

describe('confluence create-footer-comment tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-footer-comment',
        Model: 'ActionOutput_confluence_createfootercomment'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
