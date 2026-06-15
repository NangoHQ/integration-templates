import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-employee.js';

describe('zoho-people update-employee tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-employee',
        Model: 'ActionOutput_zoho_people_updateemployee'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
