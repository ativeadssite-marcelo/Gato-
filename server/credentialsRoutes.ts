// =========================================================================
// GESTÃO DAS CREDENCIAIS DE INTEGRAÇÃO DO TENANT
// =========================================================================
// Quem chama: o admin do contratante (escopo de tenant, sempre travado na própria
// empresa) ou a equipe SaaS com `tenant_credentials` (para dar suporte a um
// cliente que perdeu acesso).
//
// O segredo em claro aparece UMA ÚNICA VEZ, na resposta de criação/rotação.
// Nenhuma rota de leitura devolve segredo — só prefixo, últimos 4 e metadados.
// =========================================================================

import { Router, Request, Response } from "express";
import {
  ROLE_DEFINITIONS,
  TENANTS_DATA,
  TENANT_PERMISSION_CATALOG,
  TENANT_PERMISSION_GROUPS,
} from "./rbacEngine";
import { requireAuth, requirePermission, recordAudit } from "./auth";
import {
  createOrRotateCredential,
  defaultLabelFor,
  deactivateMachine,
  getActiveActivation,
  getCredential,
  listCredentials,
  revokeCredential,
} from "./credentials";
import { getApiQuota } from "./quotas";
import type { CredentialKind, CredentialView } from "../src/types/credentials";
import type { RbacUser, TenantPermissionKey } from "../src/types/rbac";

export const credentialsRouter = Router();

credentialsRouter.use(requireAuth);

const VALID_CAPABILITIES = new Set<string>(TENANT_PERMISSION_CATALOG.map((p) => p.key));

/** Mantém apenas capacidades conhecidas do catálogo operacional. */
function sanitizeCapabilities(input: unknown): TenantPermissionKey[] {
  if (!Array.isArray(input)) return [];
  return input.filter(
    (k): k is TenantPermissionKey => typeof k === "string" && VALID_CAPABILITIES.has(k),
  );
}

/**
 * Decide de QUEM são as credenciais nesta requisição.
 *
 * Escopo de tenant: sempre o próprio — o `tenantId` do corpo/query é ignorado, para
 * que não exista caminho de alcançar outro contratante nem por engano.
 * Escopo SaaS: pode mirar um tenant explícito (suporte), validado contra a base.
 */
function resolveTargetTenant(
  req: Request,
  caller: RbacUser,
): { tenantId: string } | { error: string; status: number } {
  if (ROLE_DEFINITIONS[caller.roleCode]?.scope === "tenant") {
    return { tenantId: caller.tenantId };
  }

  const requested = String(
    req.query.tenantId || req.body?.tenantId || req.headers["x-target-tenant-id"] || "",
  ).trim();

  if (!requested) return { error: "Informe o tenant alvo (?tenantId=).", status: 400 };
  if (!TENANTS_DATA.some((t) => t.id === requested)) {
    return { error: "Tenant alvo não encontrado.", status: 404 };
  }
  return { tenantId: requested };
}

/** Monta a visão segura: sem hash, com o vínculo de máquina e a cota do dia. */
async function toView(credential: Awaited<ReturnType<typeof getCredential>>): Promise<CredentialView | null> {
  if (!credential) return null;
  const { keyHash: _omit, ...safe } = credential;
  const view: CredentialView = safe;

  if (credential.kind === "machine_license") {
    const activation = await getActiveActivation(credential.id);
    if (activation) {
      view.activation = {
        machineId: activation.machineId,
        machineLabel: activation.machineLabel,
        activatedAt: activation.activatedAt,
      };
    }
  } else {
    view.apiUsage = await getApiQuota(credential.tenantId);
  }
  return view;
}

// -------------------------------------------------------------------------
// Listagem
// -------------------------------------------------------------------------
credentialsRouter.get("/", requirePermission("tenant_credentials"), async (req, res) => {
  const caller = req.auth!.user;
  const target = resolveTargetTenant(req, caller);
  if ("error" in target) return res.status(target.status).json({ success: false, error: target.error });

  const own = await listCredentials(target.tenantId);
  const [apiKey, license] = await Promise.all([
    toView(own.find((c) => c.kind === "api_key")),
    toView(own.find((c) => c.kind === "machine_license")),
  ]);

  res.json({
    success: true,
    tenantId: target.tenantId,
    tenantName: TENANTS_DATA.find((t) => t.id === target.tenantId)?.name || target.tenantId,
    apiKey,
    license,
    // Catálogo + grupos para a UI montar a matriz de capacidades da chave.
    catalog: TENANT_PERMISSION_CATALOG,
    groups: TENANT_PERMISSION_GROUPS,
  });
});

// -------------------------------------------------------------------------
// Criar / rotacionar
// -------------------------------------------------------------------------
async function handleIssue(
  req: Request,
  res: Response,
  kind: CredentialKind,
): Promise<void> {
  const caller = req.auth!.user;
  const target = resolveTargetTenant(req, caller);
  if ("error" in target) {
    res.status(target.status).json({ success: false, error: target.error });
    return;
  }

  let capabilities: TenantPermissionKey[] = [];
  if (kind === "api_key") {
    capabilities = sanitizeCapabilities(req.body?.capabilities);
    if (capabilities.length === 0) {
      // Exigir escolha explícita evita uma chave que nasce podendo tudo.
      res.status(400).json({
        success: false,
        error: "Selecione ao menos uma capacidade operacional para a chave de API.",
        code: "API_KEY_NO_CAPABILITIES",
      });
      return;
    }
  }

  const existing = await getCredential(target.tenantId, kind);
  const { credential, secret } = await createOrRotateCredential({
    tenantId: target.tenantId,
    kind,
    label: typeof req.body?.label === "string" ? req.body.label : undefined,
    capabilities,
    actor: { id: caller.id, name: caller.name },
  });

  recordAudit(
    req,
    caller,
    existing ? "ROTATE_CREDENTIAL" : "CREATE_CREDENTIAL",
    "tenant_credentials",
    credential.id,
    "success",
    {
      targetTenantId: target.tenantId,
      details: `${existing ? "Rotacionada" : "Criada"} ${defaultLabelFor(kind)} do tenant ${target.tenantId}. O segredo anterior${existing ? "" : " (se havia)"} deixou de valer.`,
    },
  );

  res.json({
    success: true,
    // ÚNICA aparição do segredo. Não é recuperável depois.
    secret,
    message: existing
      ? "Credencial rotacionada. Copie o novo segredo agora: ele não será exibido de novo e o anterior já não funciona."
      : "Credencial criada. Copie o segredo agora: ele não será exibido de novo.",
    credential: await toView(credential),
  });
}

credentialsRouter.post("/api-key", requirePermission("tenant_credentials", { write: true }), (req, res) =>
  handleIssue(req, res, "api_key"),
);

credentialsRouter.post("/license-key", requirePermission("tenant_credentials", { write: true }), (req, res) =>
  handleIssue(req, res, "machine_license"),
);

// -------------------------------------------------------------------------
// Revogar
// -------------------------------------------------------------------------
async function handleRevoke(req: Request, res: Response, kind: CredentialKind): Promise<void> {
  const caller = req.auth!.user;
  const target = resolveTargetTenant(req, caller);
  if ("error" in target) {
    res.status(target.status).json({ success: false, error: target.error });
    return;
  }

  const revoked = await revokeCredential(target.tenantId, kind);
  if (!revoked) {
    res.status(404).json({ success: false, error: "Não há credencial ativa desse tipo para revogar." });
    return;
  }

  recordAudit(req, caller, "REVOKE_CREDENTIAL", "tenant_credentials", revoked.id, "warning", {
    targetTenantId: target.tenantId,
    details: `${defaultLabelFor(kind)} revogada no tenant ${target.tenantId}.${
      kind === "machine_license" ? " A máquina vinculada foi desativada." : ""
    }`,
    anomalous: true,
  });

  res.json({ success: true, message: "Credencial revogada.", credential: await toView(revoked) });
}

credentialsRouter.delete("/api-key", requirePermission("tenant_credentials", { write: true }), (req, res) =>
  handleRevoke(req, res, "api_key"),
);

credentialsRouter.delete("/license-key", requirePermission("tenant_credentials", { write: true }), (req, res) =>
  handleRevoke(req, res, "machine_license"),
);

// -------------------------------------------------------------------------
// Desvincular a máquina (sem revogar a licença)
// -------------------------------------------------------------------------
credentialsRouter.delete(
  "/license-key/activation",
  requirePermission("tenant_credentials", { write: true }),
  async (req, res) => {
    const caller = req.auth!.user;
    const target = resolveTargetTenant(req, caller);
    if ("error" in target) {
      return res.status(target.status).json({ success: false, error: target.error });
    }

    const license = await getCredential(target.tenantId, "machine_license");
    if (!license) {
      return res.status(404).json({ success: false, error: "Este tenant não tem licença de máquina." });
    }

    // Sem `machineId`: é o admin liberando o posto para uso em outra máquina.
    const result = await deactivateMachine(license);
    if (!result.ok) {
      return res.status(409).json({
        success: false,
        error: "Não há máquina vinculada a esta licença.",
        code: "NO_ACTIVE_ACTIVATION",
      });
    }

    recordAudit(req, caller, "DEACTIVATE_MACHINE", "tenant_credentials", license.id, "warning", {
      targetTenantId: target.tenantId,
      details: `Máquina desvinculada da licença do tenant ${target.tenantId} pelo administrador.`,
      anomalous: true,
    });

    return res.json({ success: true, message: "Máquina desvinculada. A licença pode ser ativada em outra." });
  },
);
