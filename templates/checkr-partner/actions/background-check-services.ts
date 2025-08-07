import { createAction } from "nango";
import { constructRequestWithConnectionConfig } from '../helpers/construct-request.js';

import type { CheckrService} from "../models.js";
import { CheckrServicesResponse } from "../models.js";
import { z } from "zod";

/**
 * Background Check Services
 * @desc this handles 3 scenarios:
 * 1. If accountHierarchyEnabled is true, then we need to fetch the services from /v1/nodes?include=packages and return the packages under their respective nodes
 * with the associated packages
 * 2. If accountHierarchyEnabled is false, then we need to fetch the services from /v1/packages
 * 3. If accountHierarchyEnabled is true and there are no services under the node, then we need to fetch the services from /v1/packages
 *
 * This means we first fetch all the available packages. If accountHierarchyEnabled is true
 * and there are nodes with packages we need to grab them from the packages to
 * attach them to the node
 */
const action = createAction({
    description: "Fetch the possible services that Checkr offers for a background check",
    version: "2.0.0",

    endpoint: {
        method: "GET",
        path: "/background-check/service-list"
    },

    input: z.void(),
    output: CheckrServicesResponse,

    exec: async (nango): Promise<CheckrServicesResponse> => {
        const { config, connection_config } = await constructRequestWithConnectionConfig(nango, '/v1/packages');

        let services: CheckrService[] = [];

        for await (const checkrServices of nango.paginate({ ...config, endpoint: '/v1/packages' })) {
            services.push(...checkrServices);
        }

        const accountHierarchyEnabled = connection_config['accountHierarchyEnabled'] || false;

        if (accountHierarchyEnabled) {
            config.endpoint = '/v1/nodes?include=packages';

            for await (const checkrServices of nango.paginate(config)) {
                if (checkrServices.length > 0) {
                    const nodePackages = checkrServices.map((node) => {
                        if (node.packages.length === 0) {
                            return node.packages;
                        }
                        const nodePackages = node.packages.map((pkg: string) => {
                            const fullPackageInfo = services.find((service) => service.slug === pkg);
                            return {
                                ...fullPackageInfo,
                                node: node.custom_id
                            };
                        });

                        return nodePackages;
                    });
                    services = nodePackages.flat();
                }
            }
        }

        return { services };
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
