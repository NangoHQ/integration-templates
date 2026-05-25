import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/change-column-value.js';

describe('monday change-column-value tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'change-column-value',
        Model: 'ActionOutput_monday_changecolumnvalue'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
