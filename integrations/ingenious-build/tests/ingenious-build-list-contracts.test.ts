import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-contracts.js';

describe('ingenious-build list-contracts tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-contracts',
        Model: 'ActionOutput_ingenious_build_listcontracts'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
