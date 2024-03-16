const core = require("@actions/core");

await run();

async function run() {
  try {
    const portainerUrl = core.getInput("portainer_url");
    const portainerApikey = core.getInput("portainer_apikey");
    const envName = core.getInput("env_name");
    const containerName = core.getInput("container_name");

    const authHeader = { "X-API-Key": portainerApikey };
    const params = {
      portainerUrl,
      portainerApikey,
      envName,
      containerName,
      authHeader,
    };

    const envId = await getEnvId(params);
    core.debug(`envId: ${envId}`);

    const containerId = await getContainerId(envId, params);
    core.debug(`containerId: ${containerId}`);

    await recreateContainer(containerId, envId, params);
    core.debug("container recreated");
  } catch (error) {
    core.setFailed(error.message);
  }
}

async function getEnvId(params) {
  const response = await fetch(`${portainerUrl}/api/endpoints`, {
    method: "GET",
    headers: { ...params.authHeader },
  });

  const data = await response.json();
  const envId = data.filter((env) => env.Name === params.envName)[0].Id;
  return envId;
}

async function getContainerId(envId, params) {
  const response = await fetch(
    `${portainerUrl}/api/endpoints/${envId}/docker/containers/json?all=true`,
    {
      method: "GET",
      headers: { ...params.authHeader },
    },
  );

  const data = await response.json();
  const containerId = data.filter((container) =>
    container.Names.some((name) => name === `/${params.containerName}`),
  )[0].Id;

  return containerId;
}

async function recreateContainer(containerId, envId, params) {
  await fetch(
    `${portainerUrl}/api/docker/${envId}/containers/${containerId}/recreate`,
    {
      method: "POST",
      headers: { ...params.authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({ PullImage: true }),
    },
  );
}
