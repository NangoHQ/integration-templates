import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-company-field.js';

describe('freshdesk create-company-field tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-company-field',
        Model: 'ActionOutput_freshdesk_createcompanyfield'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
