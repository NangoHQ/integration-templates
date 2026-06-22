import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-certificates.js';

describe('acuity-scheduling list-certificates tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-certificates',
        Model: 'ActionOutput_acuity_scheduling_listcertificates'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
