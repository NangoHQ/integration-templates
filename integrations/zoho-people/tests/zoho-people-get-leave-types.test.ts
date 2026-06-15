import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-leave-types.js';

describe('zoho-people get-leave-types tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-leave-types',
        Model: 'ActionOutput_zoho_people_getleavetypes'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
