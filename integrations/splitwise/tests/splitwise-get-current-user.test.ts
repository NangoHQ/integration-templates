import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-current-user.js';

describe('splitwise get-current-user tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-current-user',
        Model: 'ActionOutput_splitwise_getcurrentuser'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
