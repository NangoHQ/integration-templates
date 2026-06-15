import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-estimate.js';

describe('zoho-books update-estimate tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-estimate',
        Model: 'ActionOutput_zoho_books_updateestimate'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
