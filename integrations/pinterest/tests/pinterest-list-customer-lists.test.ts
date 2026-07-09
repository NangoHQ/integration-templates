import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-customer-lists.js';

describe('pinterest list-customer-lists tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-customer-lists',
        Model: 'ActionOutput_pinterest_listcustomerlists'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
