import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-available-resources.js';

describe('salesforce list-available-resources tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-available-resources',
        Model: 'ActionOutput_salesforce_listavailableresources'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
