import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-holiday.js';

describe('zoho-people create-holiday tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-holiday',
        Model: 'ActionOutput_zoho_people_createholiday'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
