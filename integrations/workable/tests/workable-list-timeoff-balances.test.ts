import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-timeoff-balances.js';

describe('workable list-timeoff-balances tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-timeoff-balances',
        Model: 'ActionOutput_workable_listtimeoffbalances'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
