import React, { useState, useEffect, useMemo } from "react";
import {
  Package,
  Plus,
  Edit3,
  Trash2,
  Copy,
  Check,
  ShieldCheck,
  Users,
  Box,
  DollarSign,
  TrendingUp,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Layers,
  ArrowRight,
  ExternalLink,
  Search,
  RefreshCw,
  X,
  FileText,
  Sliders,
  HardDrive,
  Cpu,
  Info,
} from "lucide-react";
import { apiJson } from "../services/apiClient";
import type { PlanLimitConfig, TenantAccount } from "../types/rbac";

interface Props {
  onNavigate?: (view: string) => void;
  onShowNotification?: (
    title: string,
    message: string,
    type?: "success" | "warning" | "info",
  ) => void;
}

const PRESET_FEATURES = [
  "Balcão & Orçamentos Rápidos",
  "Catálogo & Estoque de Peças",
  "Garantia CDC com Laudo e Fotos",
  "Comissões de Vendedor & Oficina",
  "Emissão de NF-e e Cupom Fiscal",
  "Ordem de Serviço (OS) com Placa e Motor",
  "Conectores Mercado Livre & Shopee",
  "SPED Fiscal & MDF-e Interestadual",
  "Multi-CDs e Filiais",
  "Gestão de Frota e Veículos",
  "Acesso API Dedicada",
  "Suporte Prioritário WhatsApp",
];

const STORAGE_KEY_CUSTOM_PLANS = "gato_saas_custom_plans";

export const GestaoPacotesPlanos: React.FC<Props> = ({ onNavigate, onShowNotification }) => {
  const [plans, setPlans] = useState<PlanLimitConfig[]>([]);
  const [tenants, setTenants] = useState<TenantAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  // Modal de edição / criação
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanLimitConfig | null>(null);

  // Modal para ver clientes do plano
  const [inspectingPlanTenants, setInspectingPlanTenants] = useState<PlanLimitConfig | null>(null);

  // Estado do formulário
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formBadge, setFormBadge] = useState("");
  const [formPriceMonthly, setFormPriceMonthly] = useState<number>(199);
  const [formPriceAnnual, setFormPriceAnnual] = useState<number>(1990);
  const [formMaxItems, setFormMaxItems] = useState<number>(5000);
  const [formMaxCustomers, setFormMaxCustomers] = useState<number>(1000);
  const [formMaxUsers, setFormMaxUsers] = useState<number>(5);
  const [formMaxEmployees, setFormMaxEmployees] = useState<number>(15);
  const [formMaxStorageGb, setFormMaxStorageGb] = useState<number>(10);
  const [formMaxApiReq, setFormMaxApiReq] = useState<number>(2000);
  const [formActive, setFormActive] = useState<boolean>(true);
  const [formFeatures, setFormFeatures] = useState<string[]>([]);
  const [customFeatureInput, setCustomFeatureInput] = useState("");
  const [saving, setSaving] = useState(false);

  // Edição rápida inline de preço ou cotas na tabela
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [inlinePrice, setInlinePrice] = useState<number>(0);
  const [inlineItems, setInlineItems] = useState<number>(0);
  const [inlineCustomers, setInlineCustomers] = useState<number>(0);

  const loadData = async () => {
    setLoading(true);
    try {
      const [plansRes, tenantsRes] = await Promise.all([
        apiJson<{ success: boolean; plans: PlanLimitConfig[] }>("/api/rbac/plans").catch(() => ({
          success: false,
          plans: [],
        })),
        apiJson<{ success: boolean; tenants: TenantAccount[] }>("/api/rbac/tenants").catch(() => ({
          success: false,
          tenants: [],
        })),
      ]);

      let loadedPlans = plansRes.plans || [];

      // Fallback local caso a API retorne vazia
      if (loadedPlans.length === 0) {
        const local = localStorage.getItem(STORAGE_KEY_CUSTOM_PLANS);
        if (local) {
          try {
            loadedPlans = JSON.parse(local);
          } catch {
            // ignore
          }
        }
      }

      if (loadedPlans.length === 0) {
        loadedPlans = [
          {
            id: "plan_starter",
            code: "starter",
            name: "GATO Starter (Essencial)",
            description:
              "Ideal para autopeças e oficinas iniciantes com balcão de vendas e controle de estoque ágil.",
            priceMonthly: 189.9,
            priceAnnual: 1899.0,
            badge: "Essencial",
            active: true,
            quotas: {
              maxCustomers: 300,
              maxItems: 1500,
              maxUsers: 3,
              maxEmployees: 5,
              maxStorageMb: 2048,
              maxInternalMessagesMonth: 200,
              maxApiRequestsPerDay: 500,
            },
            features: [
              "Balcão & Orçamentos",
              "Catálogo Básico",
              "NF-e Balcão",
              "Garantia CDC de Peças",
              "Suporte em Horário Comercial",
            ],
          },
          {
            id: "plan_pro",
            code: "pro",
            name: "GATO Pro (Crescimento)",
            description:
              "Pacote completo para oficinas e autopeças consolidadas com integração de comissões e marketplaces.",
            priceMonthly: 389.9,
            priceAnnual: 3899.0,
            badge: "Mais Popular",
            active: true,
            quotas: {
              maxCustomers: 2500,
              maxItems: 15000,
              maxUsers: 10,
              maxEmployees: 25,
              maxStorageMb: 10240,
              maxInternalMessagesMonth: 1500,
              maxApiRequestsPerDay: 5000,
            },
            features: [
              "Conectores Mercado Livre & Shopee",
              "SPED Fiscal",
              "MDF-e Interestadual",
              "Multi-CDs Filiais",
              "Garantia CDC com Fotos",
              "Comissões de Vendedor e Oficina",
              "Suporte Prioritário",
            ],
          },
          {
            id: "plan_enterprise",
            code: "enterprise",
            name: "GATO Enterprise (Frota & Distribuição)",
            description:
              "Para redes de autopeças, distribuidores e centros automotivos com alto volume de peças e filiais.",
            priceMonthly: 890.0,
            priceAnnual: 8900.0,
            badge: "Corporativo",
            active: true,
            quotas: {
              maxCustomers: 20000,
              maxItems: 100000,
              maxUsers: 50,
              maxEmployees: 120,
              maxStorageMb: 102400,
              maxInternalMessagesMonth: 20000,
              maxApiRequestsPerDay: 50000,
            },
            features: [
              "Acesso API Dedicada",
              "Auditoria em Tempo Real",
              "IP Allowlist Avançado",
              "Gestor de Contas CS Dedicado",
              "Comissões Avançadas & OS Customizada",
              "SLA 99.9%",
            ],
          },
        ];
      }

      setPlans(loadedPlans);
      setTenants(tenantsRes.tenants || []);
      localStorage.setItem(STORAGE_KEY_CUSTOM_PLANS, JSON.stringify(loadedPlans));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const openCreateModal = () => {
    setEditingPlan(null);
    setFormName("");
    setFormCode("");
    setFormDescription("Pacote completo com balcão, estoque de peças e gestão de garantias.");
    setFormBadge("Novo");
    setFormPriceMonthly(249.9);
    setFormPriceAnnual(2499.0);
    setFormMaxItems(5000);
    setFormMaxCustomers(1000);
    setFormMaxUsers(5);
    setFormMaxEmployees(15);
    setFormMaxStorageGb(10);
    setFormMaxApiReq(2000);
    setFormActive(true);
    setFormFeatures([
      "Balcão & Orçamentos Rápidos",
      "Catálogo & Estoque de Peças",
      "Garantia CDC com Laudo e Fotos",
      "Comissões de Vendedor & Oficina",
      "Emissão de NF-e e Cupom Fiscal",
    ]);
    setIsModalOpen(true);
  };

  const openEditModal = (plan: PlanLimitConfig) => {
    setEditingPlan(plan);
    setFormName(plan.name);
    setFormCode(plan.code);
    setFormDescription(plan.description || "");
    setFormBadge(plan.badge || "");
    setFormPriceMonthly(plan.priceMonthly);
    setFormPriceAnnual(plan.priceAnnual || plan.priceMonthly * 10);
    setFormMaxItems(plan.quotas.maxItems);
    setFormMaxCustomers(plan.quotas.maxCustomers);
    setFormMaxUsers(plan.quotas.maxUsers);
    setFormMaxEmployees(plan.quotas.maxEmployees);
    setFormMaxStorageGb(Math.round(plan.quotas.maxStorageMb / 1024));
    setFormMaxApiReq(plan.quotas.maxApiRequestsPerDay);
    setFormActive(plan.active !== false);
    setFormFeatures(plan.features || []);
    setIsModalOpen(true);
  };

  const handleDuplicate = (plan: PlanLimitConfig) => {
    setEditingPlan(null);
    setFormName(`${plan.name} (Cópia)`);
    setFormCode(`${plan.code}_copia`);
    setFormDescription(plan.description || "");
    setFormBadge("Personalizado");
    setFormPriceMonthly(plan.priceMonthly);
    setFormPriceAnnual(plan.priceAnnual || plan.priceMonthly * 10);
    setFormMaxItems(plan.quotas.maxItems);
    setFormMaxCustomers(plan.quotas.maxCustomers);
    setFormMaxUsers(plan.quotas.maxUsers);
    setFormMaxEmployees(plan.quotas.maxEmployees);
    setFormMaxStorageGb(Math.round(plan.quotas.maxStorageMb / 1024));
    setFormMaxApiReq(plan.quotas.maxApiRequestsPerDay);
    setFormActive(true);
    setFormFeatures([...plan.features]);
    setIsModalOpen(true);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert("Por favor informe o nome do pacote.");
      return;
    }
    if (formPriceMonthly <= 0) {
      alert("O valor mensal do pacote deve ser maior que zero.");
      return;
    }

    setSaving(true);
    const planPayload = {
      name: formName.trim(),
      code: formCode.trim() || formName.toLowerCase().replace(/[^a-z0-9]/g, "_"),
      description: formDescription.trim(),
      badge: formBadge.trim() || undefined,
      priceMonthly: Number(formPriceMonthly),
      priceAnnual: Number(formPriceAnnual) || Number((formPriceMonthly * 10).toFixed(2)),
      active: formActive,
      quotas: {
        maxCustomers: Number(formMaxCustomers),
        maxItems: Number(formMaxItems),
        maxUsers: Number(formMaxUsers),
        maxEmployees: Number(formMaxEmployees),
        maxStorageMb: Number(formMaxStorageGb) * 1024,
        maxInternalMessagesMonth: 1000,
        maxApiRequestsPerDay: Number(formMaxApiReq),
      },
      features: formFeatures,
    };

    try {
      if (editingPlan) {
        // Atualizar
        await apiJson(`/api/rbac/plans/${editingPlan.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(planPayload),
        });

        setPlans((prev) =>
          prev.map((p) =>
            p.id === editingPlan.id
              ? {
                  ...p,
                  ...planPayload,
                  quotas: {
                    ...p.quotas,
                    ...planPayload.quotas,
                  },
                  updatedAt: new Date().toISOString(),
                }
              : p,
          ),
        );

        onShowNotification?.(
          "Pacote Atualizado",
          `O pacote "${formName}" teve seu valor e cotas de itens/clientes atualizados com sucesso.`,
          "success",
        );
      } else {
        // Criar
        const res = await apiJson<{ success: boolean; plan: PlanLimitConfig }>("/api/rbac/plans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(planPayload),
        });

        const created = res.plan || {
          ...planPayload,
          id: `plan_${Date.now()}`,
          createdAt: new Date().toISOString(),
        };

        setPlans((prev) => [created, ...prev]);

        onShowNotification?.(
          "Novo Pacote Cadastrado",
          `O pacote "${formName}" foi cadastrado por R$ ${formPriceMonthly.toFixed(2)}/mês e já está disponível para os clientes.`,
          "success",
        );
      }

      setIsModalOpen(false);
      localStorage.setItem(STORAGE_KEY_CUSTOM_PLANS, JSON.stringify(plans));
    } catch {
      // Fallback local se estiver offline
      const updatedList = editingPlan
        ? plans.map((p) =>
            p.id === editingPlan.id
              ? {
                  ...p,
                  ...planPayload,
                  quotas: {
                    ...p.quotas,
                    ...planPayload.quotas,
                  },
                }
              : p,
          )
        : [
            {
              ...planPayload,
              id: `plan_${Date.now()}`,
              createdAt: new Date().toISOString(),
            },
            ...plans,
          ];

      setPlans(updatedList);
      localStorage.setItem(STORAGE_KEY_CUSTOM_PLANS, JSON.stringify(updatedList));
      setIsModalOpen(false);
      onShowNotification?.(
        editingPlan ? "Pacote Atualizado" : "Pacote Cadastrado",
        `Alterações salvas com sucesso no painel de administração.`,
        "success",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlan = async (plan: PlanLimitConfig) => {
    const tenantsUsing = tenants.filter((t) => t.planId === plan.id);
    if (tenantsUsing.length > 0) {
      alert(
        `Não é possível excluir o pacote "${plan.name}" porque existem ${tenantsUsing.length} empresas clientes utilizando-o. Altere o plano delas antes de excluir.`,
      );
      return;
    }

    if (
      !confirm(`Tem certeza que deseja excluir o pacote "${plan.name}"? Esta ação é definitiva.`)
    ) {
      return;
    }

    try {
      await apiJson(`/api/rbac/plans/${plan.id}`, { method: "DELETE" });
    } catch {
      // fallback
    }

    const updated = plans.filter((p) => p.id !== plan.id);
    setPlans(updated);
    localStorage.setItem(STORAGE_KEY_CUSTOM_PLANS, JSON.stringify(updated));
    onShowNotification?.(
      "Pacote Removido",
      `O pacote "${plan.name}" foi excluído do catálogo.`,
      "info",
    );
  };

  const handleToggleActive = async (plan: PlanLimitConfig) => {
    const nextState = plan.active === false ? true : false;
    try {
      await apiJson(`/api/rbac/plans/${plan.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: nextState }),
      });
    } catch {
      // fallback
    }

    setPlans((prev) => prev.map((p) => (p.id === plan.id ? { ...p, active: nextState } : p)));
    onShowNotification?.(
      nextState ? "Pacote Ativado" : "Pacote Pausado",
      `O pacote "${plan.name}" agora está ${nextState ? "ativo para novas contratações" : "inativo para novas vendas"}.`,
      "info",
    );
  };

  const handleStartInlineEdit = (p: PlanLimitConfig) => {
    setInlineEditingId(p.id);
    setInlinePrice(p.priceMonthly);
    setInlineItems(p.quotas.maxItems);
    setInlineCustomers(p.quotas.maxCustomers);
  };

  const handleSaveInlineEdit = async (p: PlanLimitConfig) => {
    try {
      await apiJson(`/api/rbac/plans/${p.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceMonthly: Number(inlinePrice),
          quotas: {
            ...p.quotas,
            maxItems: Number(inlineItems),
            maxCustomers: Number(inlineCustomers),
          },
        }),
      });
    } catch {
      // fallback
    }

    setPlans((prev) =>
      prev.map((item) =>
        item.id === p.id
          ? {
              ...item,
              priceMonthly: Number(inlinePrice),
              quotas: {
                ...item.quotas,
                maxItems: Number(inlineItems),
                maxCustomers: Number(inlineCustomers),
              },
            }
          : item,
      ),
    );

    setInlineEditingId(null);
    onShowNotification?.(
      "Valores Atualizados",
      `O pacote "${p.name}" foi atualizado com valor de R$ ${Number(inlinePrice).toFixed(2)}, cota de ${Number(inlineItems).toLocaleString()} itens e ${Number(inlineCustomers).toLocaleString()} clientes.`,
      "success",
    );
  };

  const filteredPlans = useMemo(() => {
    if (!searchTerm.trim()) return plans;
    const q = searchTerm.toLowerCase();
    return plans.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q),
    );
  }, [plans, searchTerm]);

  // Estatísticas dos Pacotes
  const stats = useMemo(() => {
    const totalPlans = plans.length;
    const activePlans = plans.filter((p) => p.active !== false).length;
    const avgPrice =
      plans.length > 0 ? plans.reduce((acc, p) => acc + p.priceMonthly, 0) / plans.length : 0;
    const totalTenantsCount = tenants.length;

    // Calcular MRR real com base nos planos contratados
    const mrr = tenants.reduce((acc, t) => {
      const plan = plans.find((p) => p.id === t.planId);
      return acc + (plan?.priceMonthly || 249.9);
    }, 0);

    return {
      totalPlans,
      activePlans,
      avgPrice,
      totalTenantsCount,
      mrr,
    };
  }, [plans, tenants]);

  const toggleFeature = (feat: string) => {
    setFormFeatures((prev) =>
      prev.includes(feat) ? prev.filter((f) => f !== feat) : [...prev, feat],
    );
  };

  const handleAddCustomFeature = () => {
    const trimmed = customFeatureInput.trim();
    if (!trimmed) return;
    if (!formFeatures.includes(trimmed)) {
      setFormFeatures((prev) => [...prev, trimmed]);
    }
    setCustomFeatureInput("");
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-['Plus_Jakarta_Sans'] animate-in fade-in duration-300">
      {/* BANNER PRINCIPAL DO SUPER ADMIN */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 p-6 md:p-8 border border-indigo-500/30 shadow-2xl text-white">
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-black uppercase tracking-wider">
              <Package className="w-4 h-4 text-indigo-400" />
              Super Admin — Gestão Comercial do SaaS
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              Pacotes, Preços e Cotas de Clientes
            </h1>
            <p className="text-sm text-indigo-200/90 max-w-3xl leading-relaxed">
              Cadastre os pacotes que serão fornecidos para os clientes, edite os valores de
              mensalidade a qualquer momento e defina a{" "}
              <strong>quantidade de itens cadastrados no estoque</strong> e a{" "}
              <strong>quantidade de clientes cadastrados</strong> que cada pacote contratado terá
              direito.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-extrabold text-xs shadow-lg shadow-indigo-600/30 transition transform hover:-translate-y-0.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Novo Pacote</span>
            </button>
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="p-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 transition cursor-pointer"
              title="Recarregar"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* REGRAS CLARAS DE GOVERNANÇA */}
        <div className="mt-6 pt-5 border-t border-indigo-500/20 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="flex items-center gap-2 bg-indigo-950/40 p-3 rounded-xl border border-indigo-500/20 text-indigo-200">
            <DollarSign className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Valor Sempre Editável:</strong> Reajuste mensalidades ou anuidades sem
              interrupção de serviço.
            </span>
          </div>
          <div className="flex items-center gap-2 bg-indigo-950/40 p-3 rounded-xl border border-indigo-500/20 text-indigo-200">
            <Box className="w-4 h-4 text-sky-400 shrink-0" />
            <span>
              <strong>Cota de Itens / Peças:</strong> Limite de itens em catálogo/estoque vendido no
              pacote.
            </span>
          </div>
          <div className="flex items-center gap-2 bg-indigo-950/40 p-3 rounded-xl border border-indigo-500/20 text-indigo-200">
            <Users className="w-4 h-4 text-purple-400 shrink-0" />
            <span>
              <strong>Cota de Clientes da Loja:</strong> Limite de clientes cadastrados pelo
              contratante.
            </span>
          </div>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Pacotes Criados</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-800">{stats.totalPlans} pacotes</div>
          <p className="text-xs text-slate-500 mt-1">
            <strong className="text-emerald-600">{stats.activePlans} ativos</strong> para venda
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Ticket Médio Mensal</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600">R$ {stats.avgPrice.toFixed(2)}</div>
          <p className="text-xs text-slate-500 mt-1">Média de preço dos pacotes ativos</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">
              Clientes Contratantes
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-800">
            {stats.totalTenantsCount} empresas
          </div>
          <p className="text-xs text-slate-500 mt-1">Assinantes ativos nos pacotes</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">MRR de Assinaturas</span>
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-sky-700">
            R${" "}
            {stats.mrr.toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <p className="text-xs text-slate-500 mt-1">Receita Recorrente Mensal estimada</p>
        </div>
      </div>

      {/* BARRA DE PESQUISA & VISUALIZAÇÃO */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome do pacote, código ou recurso..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                viewMode === "cards"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Grade Comercial
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                viewMode === "table"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Tabela de Cotas & Edição Rápida
            </button>
          </div>
        </div>
      </div>

      {/* VISUALIZAÇÃO EM GRADE DE CARDS */}
      {viewMode === "cards" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredPlans.map((plan) => {
            const tenantsCount = tenants.filter((t) => t.planId === plan.id).length;
            const isEditingThis = inlineEditingId === plan.id;

            return (
              <div
                key={plan.id}
                className={`rounded-3xl border transition-all flex flex-col justify-between overflow-hidden ${
                  plan.active === false
                    ? "bg-slate-50/70 border-slate-200 opacity-80"
                    : "bg-white border-slate-200 shadow-md hover:shadow-xl hover:border-indigo-300"
                }`}
              >
                {/* TOPO DO CARD */}
                <div className="p-6">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      {plan.badge && (
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-600 border border-indigo-200 mb-2">
                          {plan.badge}
                        </span>
                      )}
                      <h3 className="text-lg font-black text-slate-800">{plan.name}</h3>
                      <span className="text-[11px] font-mono text-slate-400">
                        Código: {plan.code}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(plan)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition ${
                          plan.active !== false
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                            : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                        }`}
                        title="Clique para alternar disponibilidade para novas vendas"
                      >
                        {plan.active !== false ? "Ativo" : "Inativo"}
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 mb-5 min-h-[36px] line-clamp-2 leading-relaxed">
                    {plan.description ||
                      "Pacote comercial parametrizado para autopeças e oficinas."}
                  </p>

                  {/* PREÇO EDITÁVEL */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/50 to-purple-50/50 border border-indigo-100 mb-5">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Valor Mensal:
                      </span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xs font-bold text-indigo-600">R$</span>
                        <span className="text-2xl font-black text-slate-900">
                          {plan.priceMonthly.toFixed(2)}
                        </span>
                        <span className="text-xs text-slate-500">/mês</span>
                      </div>
                    </div>

                    {plan.priceAnnual && (
                      <div className="mt-2 pt-2 border-t border-indigo-100/60 flex items-center justify-between text-[11px] text-slate-600">
                        <span>Anual com desconto:</span>
                        <span className="font-bold text-slate-800">
                          R$ {plan.priceAnnual.toFixed(2)}/ano
                        </span>
                      </div>
                    )}
                  </div>

                  {/* DESTAQUES DAS COTAS DEFINIDAS PELO ADMIN */}
                  <div className="space-y-3 mb-6">
                    <div className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
                      Cotas Vendidas no Pacote:
                    </div>

                    {/* COTA DE ITENS CADASTRADOS */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-2">
                        <Box className="w-4 h-4 text-sky-600" />
                        <div>
                          <div className="text-xs font-bold text-slate-800">
                            Itens em Estoque / Catálogo
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Limite de peças cadastradas
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-black text-sky-700 font-mono">
                        {plan.quotas.maxItems.toLocaleString()} itens
                      </span>
                    </div>

                    {/* COTA DE CLIENTES CADASTRADOS */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-purple-600" />
                        <div>
                          <div className="text-xs font-bold text-slate-800">
                            Clientes Cadastrados
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Permitido para o contratante
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-black text-purple-700 font-mono">
                        {plan.quotas.maxCustomers.toLocaleString()} clientes
                      </span>
                    </div>

                    {/* DEMAIS LIMITES */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1">
                      <div className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span>
                          Até <strong>{plan.quotas.maxUsers}</strong> usuários
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span>
                          <strong>{(plan.quotas.maxStorageMb / 1024).toFixed(0)} GB</strong> nuvem
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* RECURSOS INCLUSOS */}
                  <div className="space-y-2 border-t border-slate-100 pt-4">
                    <div className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
                      Recursos Fornecidos ({plan.features.length}):
                    </div>
                    <ul className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                      {plan.features.map((feat, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-xs text-slate-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span className="truncate">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* RODAPÉ DO CARD COM AÇÕES DO ADMIN */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setInspectingPlanTenants(plan)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition"
                    title="Ver empresas que contrataram este pacote"
                  >
                    <Users className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{tenantsCount} assinante(s)</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleDuplicate(plan)}
                      className="p-2 rounded-xl text-slate-600 hover:text-indigo-600 hover:bg-white border border-transparent hover:border-slate-200 transition"
                      title="Duplicar Pacote"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(plan)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePlan(plan)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      title="Excluir pacote"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VISUALIZAÇÃO EM TABELA DE LIMITES E EDIÇÃO RÁPIDA */}
      {viewMode === "table" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-black text-slate-800 text-base">
                Tabela de Limites, Preços e Cotas por Pacote
              </h3>
              <p className="text-xs text-slate-500">
                Edite os valores e cotas de itens ou clientes diretamente na tabela com um clique.
              </p>
            </div>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition"
            >
              <Plus className="w-4 h-4" /> Cadastrar Pacote
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-black text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Pacote / Identificador</th>
                  <th className="px-5 py-3.5">Valor Mensal (R$)</th>
                  <th className="px-5 py-3.5">Cota de Itens (Peças)</th>
                  <th className="px-5 py-3.5">Cota de Clientes da Loja</th>
                  <th className="px-5 py-3.5">Usuários / Armazenamento</th>
                  <th className="px-5 py-3.5">Clientes Ativos</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPlans.map((plan) => {
                  const tenantsCount = tenants.filter((t) => t.planId === plan.id).length;
                  const isInline = inlineEditingId === plan.id;

                  return (
                    <tr key={plan.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900 text-sm">{plan.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">ID: {plan.id}</div>
                        {plan.badge && (
                          <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700">
                            {plan.badge}
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {isInline ? (
                          <div className="flex items-center gap-1">
                            <span className="text-slate-500">R$</span>
                            <input
                              type="number"
                              step="0.01"
                              value={inlinePrice}
                              onChange={(e) => setInlinePrice(parseFloat(e.target.value) || 0)}
                              className="w-24 px-2 py-1 border border-indigo-400 rounded-lg text-xs font-bold text-indigo-700"
                            />
                          </div>
                        ) : (
                          <div className="font-black text-indigo-600 text-sm">
                            R$ {plan.priceMonthly.toFixed(2)}
                            <span className="text-[10px] font-normal text-slate-400 block">
                              /mês
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {isInline ? (
                          <input
                            type="number"
                            value={inlineItems}
                            onChange={(e) => setInlineItems(parseInt(e.target.value, 10) || 0)}
                            className="w-28 px-2 py-1 border border-indigo-400 rounded-lg text-xs font-bold text-sky-700"
                          />
                        ) : (
                          <div className="flex items-center gap-1.5 font-bold text-sky-700 font-mono">
                            <Box className="w-3.5 h-3.5 text-sky-500" />
                            <span>{plan.quotas.maxItems.toLocaleString()} itens</span>
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {isInline ? (
                          <input
                            type="number"
                            value={inlineCustomers}
                            onChange={(e) => setInlineCustomers(parseInt(e.target.value, 10) || 0)}
                            className="w-28 px-2 py-1 border border-indigo-400 rounded-lg text-xs font-bold text-purple-700"
                          />
                        ) : (
                          <div className="flex items-center gap-1.5 font-bold text-purple-700 font-mono">
                            <Users className="w-3.5 h-3.5 text-purple-500" />
                            <span>{plan.quotas.maxCustomers.toLocaleString()} clientes</span>
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        <div>{plan.quotas.maxUsers} usuários</div>
                        <div className="text-[11px] text-slate-400">
                          {(plan.quotas.maxStorageMb / 1024).toFixed(0)} GB nuvem
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => setInspectingPlanTenants(plan)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                        >
                          <Users className="w-3 h-3 text-indigo-500" />
                          <span>{tenantsCount} cliente(s)</span>
                        </button>
                      </td>

                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(plan)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black border transition ${
                            plan.active !== false
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          {plan.active !== false ? "Ativo" : "Inativo"}
                        </button>
                      </td>

                      <td className="px-5 py-4 text-right">
                        {isInline ? (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleSaveInlineEdit(plan)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" /> Salvar
                            </button>
                            <button
                              type="button"
                              onClick={() => setInlineEditingId(null)}
                              className="px-2 py-1.5 rounded-lg bg-slate-200 text-slate-700 font-bold text-xs"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleStartInlineEdit(plan)}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition"
                              title="Ajuste rápido de preço e limites"
                            >
                              Ajuste Rápido
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditModal(plan)}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-slate-100 transition"
                              title="Edição completa"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePlan(plan)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                              title="Excluir pacote"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL DE CADASTRO & EDIÇÃO COMPLETA DO PACOTE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8">
            <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-indigo-500/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">
                    {editingPlan
                      ? `Editar Pacote: ${editingPlan.name}`
                      : "Cadastrar Novo Pacote para Clientes"}
                  </h3>
                  <p className="text-xs text-indigo-200/80">
                    Defina o valor mensal, cota de itens em estoque e clientes permitidos para venda
                    ao cliente.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="p-6 space-y-6">
              {/* SEÇÃO 1: IDENTIFICAÇÃO DO PACOTE */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-black uppercase text-indigo-600 tracking-wider">
                  <FileText className="w-4 h-4" /> 1. Identificação do Pacote
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nome do Pacote Comercial *
                    </label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => {
                        setFormName(e.target.value);
                        if (!editingPlan) {
                          setFormCode(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "_"));
                        }
                      }}
                      placeholder="Ex: GATO Pro Distribuidora & Balcão"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Identificador / Slug *
                    </label>
                    <input
                      type="text"
                      required
                      value={formCode}
                      onChange={(e) =>
                        setFormCode(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
                      }
                      placeholder="ex: autopecas_pro"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Descrição Comercial para o Cliente
                    </label>
                    <input
                      type="text"
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="Resumo dos benefícios fornecidos para o cliente..."
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Selo / Badge de Destaque
                    </label>
                    <input
                      type="text"
                      value={formBadge}
                      onChange={(e) => setFormBadge(e.target.value)}
                      placeholder="Ex: Mais Popular, Recomendado"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* SEÇÃO 2: VALOR EDITÁVEL (PREÇO) */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50/40 via-purple-50/30 to-slate-50 border border-indigo-100 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-black uppercase text-indigo-700 tracking-wider">
                    <DollarSign className="w-4 h-4 text-emerald-600" /> 2. Valores Editáveis
                    (Precificação do Pacote)
                  </div>
                  <span className="text-[11px] font-bold text-indigo-600 bg-white px-2.5 py-0.5 rounded-full border border-indigo-200">
                    Sempre editável pelo Super Admin
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Valor Mensal (R$) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-xs font-black text-slate-400">
                        R$
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={formPriceMonthly}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setFormPriceMonthly(val);
                          setFormPriceAnnual(Number((val * 10).toFixed(2)));
                        }}
                        className="w-full pl-10 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-black text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Cobrança recorrente mensal faturada ao contratante.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Valor Anual com Desconto (R$)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-xs font-black text-slate-400">
                        R$
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        value={formPriceAnnual}
                        onChange={(e) => setFormPriceAnnual(parseFloat(e.target.value) || 0)}
                        className="w-full pl-10 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-black text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <span className="text-[11px] text-emerald-600 mt-1 block font-medium">
                      Equivalente a R$ {(formPriceAnnual / 12).toFixed(2)}/mês (2 meses grátis).
                    </span>
                  </div>
                </div>
              </div>

              {/* SEÇÃO 3: DEFINIÇÃO DE QUANTIDADE DE ITENS E CLIENTES (COTAS) */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                <div className="flex items-center gap-2 text-xs font-black uppercase text-indigo-700 tracking-wider">
                  <Sliders className="w-4 h-4 text-indigo-600" /> 3. Definição de Cotas do Pacote
                  Vendido
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* COTA DE ITENS CADASTRADOS */}
                  <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                        <Box className="w-4 h-4 text-sky-600" /> Quantidade de Itens / Peças
                        Cadastradas *
                      </label>
                    </div>
                    <input
                      type="number"
                      required
                      min={100}
                      value={formMaxItems}
                      onChange={(e) => setFormMaxItems(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-3 py-2 bg-sky-50/50 border border-sky-200 rounded-xl text-sm font-mono font-black text-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className="text-[10px] text-slate-400 font-bold self-center mr-1">
                        Presets:
                      </span>
                      {[1500, 5000, 15000, 50000, 100000].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setFormMaxItems(num)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                            formMaxItems === num
                              ? "bg-sky-600 text-white"
                              : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                          }`}
                        >
                          {num >= 1000 ? `${num / 1000}k` : num}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Limite de produtos cadastrados no catálogo e estoque do cliente contratante.
                    </p>
                  </div>

                  {/* COTA DE CLIENTES CADASTRADOS */}
                  <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-purple-600" /> Quantidade de Clientes
                        Cadastrados *
                      </label>
                    </div>
                    <input
                      type="number"
                      required
                      min={50}
                      value={formMaxCustomers}
                      onChange={(e) => setFormMaxCustomers(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-3 py-2 bg-purple-50/50 border border-purple-200 rounded-xl text-sm font-mono font-black text-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className="text-[10px] text-slate-400 font-bold self-center mr-1">
                        Presets:
                      </span>
                      {[300, 1000, 2500, 10000, 25000].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setFormMaxCustomers(num)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                            formMaxCustomers === num
                              ? "bg-purple-600 text-white"
                              : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                          }`}
                        >
                          {num >= 1000 ? `${num / 1000}k` : num}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Limite de clientes finais cadastrados na base do lojista/oficina contratante.
                    </p>
                  </div>
                </div>

                {/* COTAS TÉCNICAS ADICIONAIS */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Usuários Simultâneos
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={formMaxUsers}
                      onChange={(e) => setFormMaxUsers(parseInt(e.target.value, 10) || 1)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Armazenamento Nuvem (GB)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={formMaxStorageGb}
                      onChange={(e) => setFormMaxStorageGb(parseInt(e.target.value, 10) || 1)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Requisições API / Dia
                    </label>
                    <input
                      type="number"
                      min={100}
                      value={formMaxApiReq}
                      onChange={(e) => setFormMaxApiReq(parseInt(e.target.value, 10) || 100)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* SEÇÃO 4: RECURSOS & MÓDULOS INCLUSOS */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-black uppercase text-indigo-700 tracking-wider">
                    <Sparkles className="w-4 h-4 text-amber-500" /> 4. Recursos e Módulos Fornecidos
                    ao Cliente
                  </div>
                  <span className="text-[11px] text-slate-500 font-bold">
                    {formFeatures.length} selecionado(s)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {PRESET_FEATURES.map((feat) => {
                    const isSelected = formFeatures.includes(feat);
                    return (
                      <button
                        key={feat}
                        type="button"
                        onClick={() => toggleFeature(feat)}
                        className={`text-left p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-between ${
                          isSelected
                            ? "bg-indigo-50 border-indigo-300 text-indigo-800"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <span className="truncate pr-1">{feat}</span>
                        <div
                          className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 ${
                            isSelected ? "bg-indigo-600 text-white" : "border border-slate-300"
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Adicionar recurso customizado */}
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="text"
                    value={customFeatureInput}
                    onChange={(e) => setCustomFeatureInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCustomFeature();
                      }
                    }}
                    placeholder="Adicionar recurso personalizado ao pacote..."
                    className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomFeature}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition"
                  >
                    Adicionar
                  </button>
                </div>
              </div>

              {/* STATUS ATIVO */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-slate-800 block">
                    Disponível para Novas Vendas (Ativo)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Se desativado, o pacote fica oculto para novos cadastros mas continua válido
                    para quem já comprou.
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formActive}
                    onChange={(e) => setFormActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
                </label>
              </div>

              {/* BOTÕES DE AÇÃO */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-extrabold text-xs shadow-lg shadow-indigo-600/30 transition disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Salvando Pacote...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>
                        {editingPlan ? "Salvar Alterações do Pacote" : "Cadastrar Pacote Comercial"}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PARA INSPECIONAR CLIENTES VINCULADOS AO PLANO */}
      {inspectingPlanTenants && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <Users className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="font-black text-white text-base">
                    Empresas no Pacote: {inspectingPlanTenants.name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Valor: R$ {inspectingPlanTenants.priceMonthly.toFixed(2)}/mês • Cota:{" "}
                    {inspectingPlanTenants.quotas.maxItems.toLocaleString()} itens /{" "}
                    {inspectingPlanTenants.quotas.maxCustomers.toLocaleString()} clientes
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectingPlanTenants(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
              {tenants.filter((t) => t.planId === inspectingPlanTenants.id).length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Nenhuma empresa cliente está contratando este pacote no momento.
                </div>
              ) : (
                tenants
                  .filter((t) => t.planId === inspectingPlanTenants.id)
                  .map((t) => (
                    <div
                      key={t.id}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-slate-900 text-xs">
                          {t.tradeName || t.name}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          CNPJ: {t.cnpj || "—"} • {t.city || "Matriz"}/{t.uf || "BR"}
                        </div>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          t.status === "active"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {t.status === "active" ? "Ativo" : "Suspenso"}
                      </span>
                    </div>
                  ))
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setInspectingPlanTenants(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
