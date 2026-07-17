import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-catalog-item.js';

describe('servicenow get-catalog-item tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-catalog-item',
        Model: 'ActionOutput_servicenow_getcatalogitem'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
