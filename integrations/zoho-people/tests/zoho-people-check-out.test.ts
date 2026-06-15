import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/check-out.js';

describe('zoho-people check-out tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'check-out',
        Model: 'ActionOutput_zoho_people_checkout'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
