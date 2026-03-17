import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/fetch-properties.js';

describe('hubspot-knnj fetch-properties tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'fetch-properties',
        Model: 'ActionOutput_hubspot_knnj_fetchproperties'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
