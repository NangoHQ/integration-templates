import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-catalogs.js';

describe('pinterest list-catalogs tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-catalogs',
        Model: 'ActionOutput_pinterest_listcatalogs'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
