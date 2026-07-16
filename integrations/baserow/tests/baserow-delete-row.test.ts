import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-row.js';

describe('baserow delete-row tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-row',
        Model: 'ActionOutput_baserow_deleterow'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
