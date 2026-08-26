import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-vault.js';

describe('basecamp get-vault tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-vault',
        Model: 'ActionOutput_basecamp_getvault'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
