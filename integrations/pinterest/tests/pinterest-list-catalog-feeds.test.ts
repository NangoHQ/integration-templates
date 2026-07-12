import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-catalog-feeds.js';

describe('pinterest list-catalog-feeds tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-catalog-feeds',
        Model: 'ActionOutput_pinterest_listcatalogfeeds'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
