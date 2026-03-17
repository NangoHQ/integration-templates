import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-association.js';

describe('hubspot create-association tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-association',
        Model: 'ActionOutput_hubspot_createassociation'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
