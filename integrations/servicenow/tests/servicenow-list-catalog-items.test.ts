import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-catalog-items.js';

describe('servicenow list-catalog-items tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-catalog-items',
        Model: 'ActionOutput_servicenow_listcatalogitems'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
