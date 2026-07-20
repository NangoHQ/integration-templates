import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-company.js';

describe('hubspot update-company clear fields tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-company-clear-fields',
        Model: 'ActionOutput_hubspot_updatecompany'
    });

    it('should send explicitly-empty optional fields so HubSpot clears them', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
