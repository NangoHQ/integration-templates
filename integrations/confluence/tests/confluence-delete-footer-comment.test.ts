import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-footer-comment.js';

describe('confluence delete-footer-comment tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-footer-comment',
        Model: 'ActionOutput_confluence_deletefootercomment'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
