import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-accounts.js';

describe('instantly list-accounts tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-accounts',
        Model: 'ActionOutput_instantly_listaccounts'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
