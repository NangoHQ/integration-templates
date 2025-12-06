const { Nango } = require("@nangohq/node");
const dotenv = require("dotenv");

// Load environment variables from .env file
dotenv.config({ path: ".env" });

function findNangoSecretKey() {
  // Get all environment variables
  const envVars = process.env;

  // Find all NANGO_SECRET_KEY variables
  const nangoKeys = Object.entries(envVars)
    .filter(([key]) => key.startsWith("NANGO_SECRET_KEY"))
    .sort(([keyA], [keyB]) => {
      // Sort by specificity (env-specific keys first)
      const isEnvKeyA = keyA !== "NANGO_SECRET_KEY";
      const isEnvKeyB = keyB !== "NANGO_SECRET_KEY";
      if (isEnvKeyA && !isEnvKeyB) return -1;
      if (!isEnvKeyA && isEnvKeyB) return 1;
      return keyA.localeCompare(keyB);
    });

  if (nangoKeys.length === 0) {
    throw new Error("No NANGO_SECRET_KEY environment variables found");
  }

  // Use the first key after sorting
  const [key, value] = nangoKeys[0];
  console.log(`Using secret key: ${key}`);
  return value;
}

function isValidConnection(connection) {
  // Connection is valid if:
  // 1. No errors array exists, or
  // 2. Errors array is empty, or
  // 3. No errors with type "auth" exist
  if (!connection.errors) return true;
  if (connection.errors.length === 0) return true;
  return !connection.errors.some((error) => error.type === "auth");
}

async function findConnections(providerConfigKey) {
  const secretKey = findNangoSecretKey();

  const nango = new Nango({
    secretKey,
  });

  // List all connections
  const { connections } = await nango.listConnections();

  // Filter for specific provider config key and valid connections
  const validConnections = connections.filter(
    (conn) =>
      conn.provider_config_key === providerConfigKey && isValidConnection(conn),
  );

  if (validConnections.length === 0) {
    console.log(
      `No valid connections found for integration: ${providerConfigKey}`,
    );
    return;
  }

  console.log(
    `Found ${validConnections.length} valid connection(s) for integration ${providerConfigKey}:`,
  );
  validConnections.forEach((conn) => {
    console.log(`- Connection ID: ${conn.connection_id}`);
    console.log(`  Provider: ${conn.provider}`);
    console.log(`  Created: ${conn.created}`);
    if (conn.errors?.length > 0) {
      console.log(`  Non-auth Errors: ${conn.errors.length}`);
    }
    console.log("---");
  });

  return validConnections;
}

// Get provider from command line arguments
const providerConfigKey = process.argv[2];

if (!providerConfigKey) {
  console.error("Usage: node find-connections.js <provider-config-key>");
  console.error("Example: node find-connections.js hubspot");
  process.exit(1);
}

findConnections(providerConfigKey).catch(console.error);
