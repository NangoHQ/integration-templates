import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-customer-contacts.js';

describe('pennylane list-customer-contacts tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-customer-contacts',
        Model: 'ActionOutput_pennylane_listcustomercontacts'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
