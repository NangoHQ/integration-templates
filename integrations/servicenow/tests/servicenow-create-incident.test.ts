import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-incident.js';

describe('servicenow create-incident tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-incident',
        Model: 'ActionOutput_servicenow_createincident'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
