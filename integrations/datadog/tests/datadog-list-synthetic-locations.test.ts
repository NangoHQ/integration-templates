import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-synthetic-locations.js';

describe('datadog list-synthetic-locations tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-synthetic-locations',
        Model: 'ActionOutput_datadog_listsyntheticlocations'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
