import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-contact.js';

describe('hubspot update-contact clear fields tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-contact-clear-fields',
        Model: 'ActionOutput_hubspot_updatecontact'
    });

    it('should send explicitly-empty optional fields so HubSpot clears them', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
