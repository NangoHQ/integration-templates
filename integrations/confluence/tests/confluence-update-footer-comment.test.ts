import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-footer-comment.js';

describe('confluence update-footer-comment tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-footer-comment',
        Model: 'ActionOutput_confluence_updatefootercomment'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
