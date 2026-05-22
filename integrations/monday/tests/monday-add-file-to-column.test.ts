import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/add-file-to-column.js';

describe('monday add-file-to-column tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'add-file-to-column',
        Model: 'ActionOutput_monday_addfiletocolumn'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
