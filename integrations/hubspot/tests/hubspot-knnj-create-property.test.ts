import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-property.js';

describe('hubspot-knnj create-property tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-property',
        Model: 'ActionOutput_hubspot_knnj_createproperty'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
