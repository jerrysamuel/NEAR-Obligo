import {
  createAgentApi,
  createIdempotencyKey,
  createGrantCredential,
  grantCommitment,
  AgentApi,
  AgentApiError,
  AgentApiRequestError,
  DEFAULT_BASE_URL,
} from "@near-intents-agent-api/sdk";

/**
 * Server-only module wrapping the NEAR Intents Agent API (Sections 7.7, 12, and 14 of Build Spec).
 * NEVER expose secrets or return grant tokens to the client.
 */

const API_KEY = process.env.NEAR_INTENTS_AGENT_API_KEY || "";
const BASE_URL = process.env.NEAR_INTENTS_AGENT_API_URL || DEFAULT_BASE_URL;

let cachedApi: AgentApi | null = null;

export function getAgentApi(): AgentApi {
  if (!cachedApi) {
    cachedApi = createAgentApi({
      apiKey: API_KEY,
      baseUrl: BASE_URL,
    });
  }
  return cachedApi;
}

export {
  createIdempotencyKey,
  createGrantCredential,
  grantCommitment,
  AgentApiError,
  AgentApiRequestError,
};

export async function whoami() {
  const api = getAgentApi();
  return await api.whoami();
}

export async function getNetwork() {
  const api = getAgentApi();
  return await api.getNetwork();
}

export async function generateIntent(
  body: any,
  options?: { idempotencyKey?: string }
) {
  const api = getAgentApi();
  const idemKey = options?.idempotencyKey || createIdempotencyKey();
  return await api.generateIntent(body, { idempotencyKey: idemKey });
}

export async function submitIntent(request: any) {
  const api = getAgentApi();
  return await api.submitIntent(request);
}

export async function getStatus(correlationId: string, waitMs: number = 30000) {
  const api = getAgentApi();
  return await api.getStatus(correlationId, { waitMs });
}

export async function getPolicy(agentId: string) {
  const api = getAgentApi();
  return await api.getPolicy(agentId);
}

export async function getBalances(agentId: string) {
  const api = getAgentApi();
  return await api.getBalances(agentId);
}

export async function createDeposit(
  agentId: string,
  request: { origin_asset: string; amount?: string },
  options?: { idempotencyKey?: string }
) {
  const api = getAgentApi();
  const idemKey = options?.idempotencyKey || createIdempotencyKey();
  return await (api as any).deposit(agentId, request, { idempotencyKey: idemKey });
}

/**
 * Executes a payment withdrawal to a vendor's NEAR account.
 * Uses POST /v1/agents/{agent_id}/withdraw with X-Grant-Token and Idempotency-Key.
 */
export async function withdraw(
  agentId: string,
  body: {
    asset: string;
    amount: string; // units as string
    chain: string; // 'near'
    recipient: string; // vendor.near
    dry?: boolean;
  },
  grantToken: string,
  idempotencyKey?: string
) {
  const api = getAgentApi();
  const authenticatedApi = api.forGrant(grantToken);
  const idemKey = idempotencyKey || createIdempotencyKey();

  return await authenticatedApi.withdraw(agentId, body, {
    idempotencyKey: idemKey,
  });
}

/**
 * Transfers funds to another NEAR Intents account.
 */
export async function transfer(
  agentId: string,
  body: {
    asset: string;
    amount: string;
    recipient: string;
  },
  grantToken: string,
  idempotencyKey?: string
) {
  const api = getAgentApi();
  const authenticatedApi = api.forGrant(grantToken);
  const idemKey = idempotencyKey || createIdempotencyKey();

  return await authenticatedApi.transfer(agentId, body, {
    idempotencyKey: idemKey,
  });
}
