import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-policy-assignments.js';

describe('dope-security update-policy-assignments tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-policy-assignments',
        Model: 'ActionOutput_dope_security_updatepolicyassignments'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
