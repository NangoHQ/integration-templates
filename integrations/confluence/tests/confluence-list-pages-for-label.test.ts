import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-pages-for-label.js';

describe('confluence list-pages-for-label tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-pages-for-label',
        Model: 'ActionOutput_confluence_listpagesforlabel'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
