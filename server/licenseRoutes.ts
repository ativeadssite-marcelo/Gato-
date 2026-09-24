// =========================================================================
// ATIVAÇÃO DA LICENÇA DE MÁQUINA
// =========================================================================
// Quem chama é o aplicativo de desktop do contratante — portanto NÃO há sessão:
// a própria licença é a credencial, apresentada em `x-license-key` (nas rotas de
// status) ou no corpo (no activate/deactivate, onde ela é o dado da operação).
//
// Regra: 1 licença = 1 máquina ativa por vez. Uma segunda máquina é recusada com
// 409 até a primeira ser desativada.
//
// RESSALVA CONHECIDA: `machineId` é informado pelo cliente, logo é falsificável.
// Isso coíbe uso simultâneo em várias máquinas no dia a dia, mas não detém um
// atacante motivado — vinculação de licença sem cliente confiável tem esse teto.
// =========================================================================

import { Router } from "express";
import { createRateLimiter } from "./rateLimit";
import { apiActorFor, recordAudit } from "./auth";
import { activateMachine, deactivateMachine, findCredentialBySecret, getActiveActivation } from "./credentials";

export const licenseRouter = Router();

/**
 * Limite estrito: estas rotas são públicas por natureza e aceitam tentativa de
 * chave, então são o alvo natural de força bruta. A busca por prefixo + hash já
 * torna o acerto inviável, e o limite evita que virem vetor de carga.
 */
const licenseLimiter = createRateLimiter(20, 60 * 1000, "lic");
licenseRouter.use(licenseLimiter);

const MAX_MACHINE_ID = 200;
const MAX_MACHINE_LABEL = 120;

interface LicenseLookup {
  credential?: Awaited<ReturnType<typeof findCredentialBySecret>>;
  machineId?: string;
  machineLabel?: string;
  error?: { status: number; code: string; message: string };
}

/** Lê e valida os campos comuns às três rotas. */
function readLicenseInput(body: any, headerKey?: string): LicenseLookup {
  const key = String(body?.key || headerKey || "").trim();
  if (!key) {
    return { error: { status: 400, code: "LICENSE_KEY_REQUIRED", message: "Informe a licença." } };
  }

  const machineId = typeof body?.machineId === "string" ? body.machineId.trim() : "";
  const machineLabel = typeof body?.machineLabel === "string" ? body.machineLabel.trim() : undefined;

  if (machineId.length > MAX_MACHINE_ID) {
    return { error: { status: 400, code: "MACHINE_ID_TOO_LONG", message: "Identificador de máquina inválido." } };
  }
  if (machineLabel && machineLabel.length > MAX_MACHINE_LABEL) {
    return { error: { status: 400, code: "MACHINE_LABEL_TOO_LONG", message: "Rótulo de máquina inválido." } };
  }

  return { machineId, machineLabel, credential: undefined };
}

/**
 * `x-license-key` no header é preferível ao corpo: evita que a licença apareça em
 * logs de payload. O corpo continua aceito para compatibilidade do activate.
 */
function headerKeyFrom(req: any): string {
  return String(req.headers["x-license-key"] || "").trim();
}

// -------------------------------------------------------------------------
// Ativar
// -------------------------------------------------------------------------
licenseRouter.post("/activate", async (req, res) => {
  const input = readLicenseInput(req.body, undefined);
  if (input.error) {
    return res.status(input.error.status).json({ success: false, error: input.error.message, code: input.error.code });
  }

  const machineId = input.machineId;
  if (!machineId) {
    return res.status(400).json({
      success: false,
      error: "Informe o identificador da máquina (machineId).",
      code: "MACHINE_ID_REQUIRED",
    });
  }

  const secret = String(req.body?.key || "").trim();
  const credential = await findCredentialBySecret(secret);

  if (!credential || credential.kind !== "machine_license") {
    // Sem tenant resolvido não há o que registrar na trilha; o sinal fica no log
    // para não permitir flood de auditoria com chaves inventadas.
    console.warn("[GATO Licença] Tentativa de ativação com licença desconhecida.");
    return res.status(401).json({
      success: false,
      error: "Licença inválida.",
      code: "LICENSE_KEY_INVALID",
    });
  }

  const result = await activateMachine(credential, machineId, input.machineLabel);

  switch (result.outcome) {
    case "activated": {
      const { activation } = result;
      recordAudit(req, apiActorFor(credential), "LICENSE_ACTIVATED", "tenant_credentials", credential.id, "success", {
        targetTenantId: credential.tenantId,
        details: `Licença ativada na máquina ${input.machineLabel || machineId}.`,
      });
      return res.json({
        success: true,
        message: "Licença ativada com sucesso.",
        activation: {
          machineId: activation.machineId,
          machineLabel: activation.machineLabel,
          activatedAt: activation.activatedAt,
        },
      });
    }

    case "revoked": {
      recordAudit(req, apiActorFor(credential), "LICENSE_ACTIVATION_BLOCKED", "tenant_credentials", credential.id, "blocked", {
        targetTenantId: credential.tenantId,
        details: "Ativação recusada: licença revogada.",
        anomalous: true,
      });
      return res.status(403).json({
        success: false,
        error: "Esta licença foi revogada. Gere uma nova no painel.",
        code: "LICENSE_KEY_REVOKED",
      });
    }

    case "already_bound": {
      const { current } = result;
      recordAudit(req, apiActorFor(credential), "LICENSE_ACTIVATION_BLOCKED", "tenant_credentials", credential.id, "blocked", {
        targetTenantId: credential.tenantId,
        details: `Ativação recusada: já existe máquina ativa (${current.machineLabel || current.machineId}).`,
        anomalous: true,
      });
      return res.status(409).json({
        success: false,
        error: "Esta licença já está ativa em outra máquina. Desative-a lá antes de ativar aqui.",
        code: "MACHINE_ALREADY_BOUND",
        currentMachine: {
          machineId: current.machineId,
          machineLabel: current.machineLabel,
          activatedAt: current.activatedAt,
        },
      });
    }
  }
});

// -------------------------------------------------------------------------
// Desativar (a própria máquina libera o posto)
// -------------------------------------------------------------------------
licenseRouter.post("/deactivate", async (req, res) => {
  const input = readLicenseInput(req.body, undefined);
  if (input.error) {
    return res.status(input.error.status).json({ success: false, error: input.error.message, code: input.error.code });
  }

  const credential = await findCredentialBySecret(String(req.body?.key || "").trim());
  if (!credential || credential.kind !== "machine_license") {
    return res.status(401).json({ success: false, error: "Licença inválida.", code: "LICENSE_KEY_INVALID" });
  }

  // Só a máquina vinculada pode se desativar — não é a licença que libera o posto,
  // é o posto que sai. O admin do tenant também pode, pelo painel.
  const result = await deactivateMachine(credential, input.machineId);

  if (!result.ok) {
    const message =
      result.reason === "machine_mismatch"
        ? "Esta máquina não é a que está ativa nesta licença."
        : "Não há máquina ativa nesta licença.";
    return res.status(409).json({ success: false, error: message, code: "NO_ACTIVE_ACTIVATION" });
  }

  recordAudit(req, apiActorFor(credential), "LICENSE_DEACTIVATED", "tenant_credentials", credential.id, "warning", {
    targetTenantId: credential.tenantId,
    details: `Licença desativada${input.machineId ? ` pela máquina ${input.machineId}` : ""}.`,
  });

  return res.json({ success: true, message: "Licença desativada. O posto está livre para outra máquina." });
});

// -------------------------------------------------------------------------
// Consultar situação
// -------------------------------------------------------------------------
licenseRouter.get("/status", async (req, res) => {
  const credential = await findCredentialBySecret(headerKeyFrom(req));
  if (!credential || credential.kind !== "machine_license") {
    return res.status(401).json({ success: false, error: "Licença inválida.", code: "LICENSE_KEY_INVALID" });
  }

  const activation = credential.active ? await getActiveActivation(credential.id) : undefined;

  return res.json({
    success: true,
    active: Boolean(credential.active && activation),
    licenseActive: credential.active,
    machineId: activation?.machineId,
    machineLabel: activation?.machineLabel,
    activatedAt: activation?.activatedAt,
  });
});
