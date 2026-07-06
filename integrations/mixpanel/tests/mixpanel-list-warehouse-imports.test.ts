import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-warehouse-imports.js';

describe('mixpanel list-warehouse-imports tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-warehouse-imports',
        Model: 'ActionOutput_mixpanel_listwarehouseimports'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
