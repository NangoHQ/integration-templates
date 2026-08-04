import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-credentials.js';

describe('connectsecure list-credentials tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-credentials',
        Model: 'ActionOutput_connectsecure_listcredentials'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
