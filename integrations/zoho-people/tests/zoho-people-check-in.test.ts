import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/check-in.js';

describe('zoho-people check-in tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'check-in',
        Model: 'ActionOutput_zoho_people_checkin'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
