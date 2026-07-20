import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-catalog-request-items.js';

describe('servicenow list-catalog-request-items tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-catalog-request-items',
        Model: 'ActionOutput_servicenow_listcatalogrequestitems'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
