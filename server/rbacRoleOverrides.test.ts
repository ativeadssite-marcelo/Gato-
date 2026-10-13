import { test, before, after } from "node:test";
import assert from "node:assert";
import http from "node:http";
import type { AddressInfo } from "node:net";
import express from "express";
import { rbacRouter } from "./rbacRoutes";
import { issueSessionToken } from "./auth";
import { RBAC_USERS_DATA, ROLE_OVERRIDES } from "./rbacEngine";

const superAdmin = RBAC_USERS_DATA.find((user) => user.roleCode === "super_admin")!;
const saasCs = RBAC_USERS_DATA.find((user) => user.roleCode === "saas_cs")!;

const app = express();
app.use(express.json());
app.use("/api/rbac", rbacRouter);
const server = http.createServer(app);
let baseUrl = "";

before(async () => {
  await new Promise<void>((resolve) => server.listen(0, resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(() => {
  server.close();
});

async function request(method: string, path: string, token: string, body?: unknown) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return {
    status: response.status,
    body: (await response.json()) as { success?: boolean; code?: string; overrides?: unknown },
  };
}

test("saas_cs cannot grant itself tenant data or reset global role overrides", async () => {
  const original = ROLE_OVERRIDES.saas_cs;
  const existingOverride = { bug_support: "read_only" as const };
  ROLE_OVERRIDES.saas_cs = existingOverride;

  try {
    const token = issueSessionToken(saasCs).token;
    const update = await request("PUT", "/api/rbac/role-overrides/saas_cs", token, {
      permissions: { company_data: "full" },
    });
    const reset = await request("DELETE", "/api/rbac/role-overrides/saas_cs", token);

    assert.equal(update.status, 403);
    assert.equal(update.body.code, "RBAC_ROLE_OVERRIDE_ADMIN_REQUIRED");
    assert.equal(reset.status, 403);
    assert.equal(reset.body.code, "RBAC_ROLE_OVERRIDE_ADMIN_REQUIRED");
    assert.deepEqual(ROLE_OVERRIDES.saas_cs, existingOverride);
  } finally {
    if (original) ROLE_OVERRIDES.saas_cs = original;
    else delete ROLE_OVERRIDES.saas_cs;
  }
});

test("super_admin role override writes retain only known resources and access levels", async () => {
  const original = ROLE_OVERRIDES.saas_config;

  try {
    const token = issueSessionToken(superAdmin).token;
    const response = await request("PUT", "/api/rbac/role-overrides/saas_config", token, {
      permissions: {
        updates: "read_only",
        company_data: "invalid_level",
        invented_resource: "full",
      },
    });

    assert.equal(response.status, 200);
    assert.deepEqual(ROLE_OVERRIDES.saas_config, { updates: "read_only" });
  } finally {
    if (original) ROLE_OVERRIDES.saas_config = original;
    else delete ROLE_OVERRIDES.saas_config;
  }
});
