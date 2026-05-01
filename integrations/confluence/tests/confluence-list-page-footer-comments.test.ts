import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-page-footer-comments.js';

describe('confluence list-page-footer-comments tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-page-footer-comments',
        Model: 'ActionOutput_confluence_listpagefootercomments'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
