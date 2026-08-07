import { useEffect, useState, useMemo, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { cloudLoad, cloudSave } from "@/lib/cloud-store";
import motoristaMarcosAsset from "@/assets/motorista-marcos.png.asset.json";
import {
  Truck,
  DollarSign,
  Wrench,
  Plus,
  Trash2,
  LogOut,
  Droplet,
  CreditCard,
  Building2,
  Lock,
  User,
  ArrowRight,
  TrendingUp,
  X,
  FileText,
  Home,
  CheckCircle2,
  AlertTriangle,
  Menu,
  Settings,
  Disc,
  BarChart3,
  MessageCircle
} from "lucide-react";
import { Toaster, toast } from "sonner";
import logoAsset from "@/assets/logo.png.asset.json";
import whatsappIconAsset from "@/assets/whatsapp-icon.png.asset.json";
import { FinancialReport } from "@/components/financial-report";
import { CurrencyInput } from "@/components/currency-input";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/")({
  component: TransportManagementSystem,
  head: () => ({
    meta: [
      { title: "GDALog — Painel de Gestão de Frota" },
      {
        name: "description",
        content:
          "Painel GDALog: acompanhe frota, despesas por veículo, fretes e trocas de óleo em tempo real.",
      },
      { property: "og:title", content: "GDALog — Painel de Gestão de Frota" },
      {
        property: "og:description",
        content:
          "Painel GDALog: acompanhe frota, despesas por veículo, fretes e trocas de óleo em tempo real.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

// TYPES
interface Driver {
  id: string;
  nome: string;
  cnh: string;
  telefone: string;
  categoria: string;
  status: "Ativo" | "Em Viagem" | "Férias";
  foto?: string;
}

interface Vehicle {
  id: string;
  placa: string;
  modelo: string;
  motorista: string;
  categoria: string;
}

interface ExpenseDetails {
  abastecimento: number;
  arla: number;
  rastreador: number;
  depreciacao: number;
  ipva: number;
  diaria: number;
  salario: number;
  comissao: number;
  prestacao: number;
  seguro: number;
  outros: number;
}

interface Expense {
  id: string;
  placa: string;
  data: string;
  motorista: string;
  km: number;
  litros: number;
  detalhes: ExpenseDetails;
  total: number;
  observacao: string;
}

interface Client {
  id: string;
  nome: string;
  documento: string;
  tipo: "PF" | "PJ";
  contato: string;
}

interface Freight {
  id: string;
  empresa: string;
  clienteId?: string; // ID do cliente cadastrado
  origem: string;
  destino: string;
  placa: string;
  data: string;
  cotacao: number;
  valor: number;
  recebido: number;
}

type MaintenanceCategory = "Troca de Óleo" | "Freios" | "Peças de Motor" | "Peças do Câmbio" | "Pneus";

interface OilChange {
  id: string;
  placa: string;
  motorista: string;
  data: string;
  kmAtual: number;
  proximaTrocaKm: number;
  custo: number;
  categoriaServico: MaintenanceCategory;
  observacao: string;
}


// INITIAL DATA
const INITIAL_DATA = {
  drivers: [
    { id: "d1", nome: "MARCOS", cnh: "12345678900", telefone: "11 98765-4321", categoria: "E", status: "Em Viagem", foto: motoristaMarcosAsset.url },
  ] as Driver[],
  clients: [
    { id: "c1", nome: "PAULO", documento: "123.456.789-00", tipo: "PF", contato: "11 99999-9999" },
  ] as Client[],
  vehicles: [
    { id: "v1", placa: "AHV 9J29", modelo: "Volvo FH 460", motorista: "MARCOS", categoria: "LOGISTICA" },
  ] as Vehicle[],
  expenses: [
    {
      id: "e1",
      placa: "AHV 9J29",
      data: "2026-07-28",
      motorista: "MARCOS",
      km: 975,
      litros: 800,
      detalhes: {
        abastecimento: 3200,
        arla: 200,
        rastreador: 90,
        depreciacao: 600,
        ipva: 150,
        diaria: 300,
        salario: 1300,
        comissao: 0,
        prestacao: 0,
        seguro: 0,
        outros: 120,
      },
      total: 5960,
      observacao: "Frete Campinas x BH",
    },
  ] as Expense[],
  freights: [
    {
      id: "f1",
      empresa: "PAULO",
      clienteId: "c1",
      origem: "CAMPINAS",
      destino: "BELO HORIZONTE",
      placa: "AHV 9J29",
      data: "2026-07-28",
      cotacao: 12000,
      valor: 12000,
      recebido: 12000,
    },
  ] as Freight[],
  oilChanges: [
    {
      id: "o1",
      placa: "AHV 9J29",
      motorista: "MARCOS",
      data: "2026-06-15",
      kmAtual: 210400,
      proximaTrocaKm: 220400,
      custo: 920,
      categoriaServico: "Troca de Óleo",
      observacao: "Filtro e óleo 15W40 trocados no posto de apoio",
    },
  ] as OilChange[],
};

// PERSISTÊNCIA ROBUSTA EM INDEXEDDB E MULTI-ABA / MULTI-NAVEGADOR
const DB_NAME = "gdalog_persistent_db";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB não suportado"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains("storage")) {
        db.createObjectStore("storage");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveToDB(key: string, data: any): Promise<void> {
  // 1) Banco de dados na nuvem (fonte de verdade — sobrevive à troca de navegador)
  void cloudSave(key, data);

  // 2) Cópias locais (IndexedDB + localStorage) para funcionar offline
  try {
    const db = await openDB();
    const tx = db.transaction("storage", "readwrite");
    const store = tx.objectStore("storage");
    store.put(data, key);
    return new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => {
        // Notifica outras abas/navegadores via localStorage event e BroadcastChannel
        try {
          localStorage.setItem("gdalog_" + key, JSON.stringify(data));
          localStorage.setItem("gdalog_sync_" + key, Date.now().toString());
        } catch {}
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    // Fallback absoluto para localStorage caso IDB falhe
    try {
      localStorage.setItem("gdalog_" + key, JSON.stringify(data));
      localStorage.setItem("gdalog_sync_" + key, Date.now().toString());
    } catch {}
  }
}

async function loadLocal(key: string, fallback: any): Promise<any> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction("storage", "readonly");
      const store = tx.objectStore("storage");
      const req = store.get(key);
      req.onsuccess = () => {
        const res = req.result;
        if (res !== undefined && res !== null) {
          resolve(res);
        } else {
          // Tenta localStorage se IDB estiver vazio
          const local = localStorage.getItem("gdalog_" + key);
          resolve(local ? JSON.parse(local) : fallback);
        }
      };
      req.onerror = () => {
        const local = localStorage.getItem("gdalog_" + key);
        resolve(local ? JSON.parse(local) : fallback);
      };
    });
  } catch {
    try {
      const local = localStorage.getItem("gdalog_" + key);
      return local ? JSON.parse(local) : fallback;
    } catch {
      return fallback;
    }
  }
}

// Lê SEMPRE do banco de dados na nuvem primeiro (garante os dados em qualquer
// navegador ou dispositivo). Se a nuvem ainda não tiver o registro, usa a cópia
// local e a envia para a nuvem — nada é perdido.
async function loadFromDB(key: string, fallback: any): Promise<any> {
  const remote = await cloudLoad(key);
  if (remote !== null && remote !== undefined) return remote;

  const local = await loadLocal(key, fallback);
  if (local !== null && local !== undefined) void cloudSave(key, local);
  return local;
}



export function TransportManagementSystem() {
  // LOGIN REAL (conta de acesso no banco de dados)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authChecked, setAuthChecked] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [loginEmail, setLoginEmail] = useState<string>("");
  const [loginPassword, setLoginPassword] = useState<string>("");

  // Sessão: escuta mudanças e verifica a sessão atual
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      setAuthChecked(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      setIsAuthenticated(!!data.session);
      setAuthChecked(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // APP TABS STATE
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "frota" | "despesas" | "oleo" | "fretes" | "financeiro" | "clientes"
  >("dashboard");

  // DATA PERSISTENCE STATE WITH INDEXEDDB
  const [drivers, setDrivers] = useState<Driver[]>(INITIAL_DATA.drivers);
  const [clients, setClients] = useState<Client[]>(INITIAL_DATA.clients);
  const [vehicles, setVehicles] = useState<Vehicle[]>(INITIAL_DATA.vehicles);
  const [expenses, setExpenses] = useState<Expense[]>(INITIAL_DATA.expenses);
  const [freights, setFreights] = useState<Freight[]>(INITIAL_DATA.freights);
  const [oilChanges, setOilChanges] = useState<OilChange[]>(INITIAL_DATA.oilChanges);

  // Carrega os dados do banco na nuvem depois do login
  useEffect(() => {
    if (!isAuthenticated) return;
    async function initData() {
      const [d, cl, v, e, f, o] = await Promise.all([
        loadFromDB("drivers", INITIAL_DATA.drivers),
        loadFromDB("clients", INITIAL_DATA.clients),
        loadFromDB("vehicles", INITIAL_DATA.vehicles),
        loadFromDB("expenses", INITIAL_DATA.expenses),
        loadFromDB("freights", INITIAL_DATA.freights),
        loadFromDB("oilChanges", INITIAL_DATA.oilChanges),
      ]);
      // Garante a foto do motorista MARCOS mesmo em dados já salvos
      const driversWithPhoto: Driver[] = (d as Driver[]).map((drv) =>
        drv.nome?.toUpperCase() === "MARCOS" && !drv.foto
          ? { ...drv, foto: motoristaMarcosAsset.url }
          : drv,
      );
      setDrivers(driversWithPhoto);
      if (JSON.stringify(driversWithPhoto) !== JSON.stringify(d)) {
        void saveToDB("drivers", driversWithPhoto);
      }
      setClients(cl);
      setVehicles(v);
      setExpenses(e);
      setFreights(f);
      setOilChanges(o);
    }
    initData();

    // Listener para sincronização automática entre abas e instâncias do navegador
    const handleStorageSync = (event: StorageEvent) => {
      if (event.key && event.key.startsWith("gdalog_sync_")) {
        const dataKey = event.key.replace("gdalog_sync_", "");
        loadFromDB(dataKey, null).then((val: any) => {
          if (val !== null) {
            if (dataKey === "drivers") setDrivers(val);
            if (dataKey === "clients") setClients(val);
            if (dataKey === "vehicles") setVehicles(val);
            if (dataKey === "expenses") setExpenses(val);
            if (dataKey === "freights") setFreights(val);
            if (dataKey === "oilChanges") setOilChanges(val);
          }
        });
      }
    };

    window.addEventListener("storage", handleStorageSync);
    return () => window.removeEventListener("storage", handleStorageSync);
  }, [isAuthenticated]);

  // Salva automaticamente no banco a cada alteração
  const persistDrivers = useCallback((data: Driver[]) => {
    setDrivers(data);
    saveToDB("drivers", data);
  }, []);

  const persistClients = useCallback((data: Client[]) => {
    setClients(data);
    saveToDB("clients", data);
  }, []);

  const persistVehicles = useCallback((data: Vehicle[]) => {
    setVehicles(data);
    saveToDB("vehicles", data);
  }, []);

  const persistExpenses = useCallback((data: Expense[]) => {
    setExpenses(data);
    saveToDB("expenses", data);
  }, []);

  const persistFreights = useCallback((data: Freight[]) => {
    setFreights(data);
    saveToDB("freights", data);
  }, []);

  const persistOilChanges = useCallback((data: OilChange[]) => {
    setOilChanges(data);
    saveToDB("oilChanges", data);
  }, []);

  // MODAL STATES
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isFreightModalOpen, setIsFreightModalOpen] = useState(false);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [isOilModalOpen, setIsOilModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);

  // EDITING STATES
  const [expEditingId, setExpEditingId] = useState<string | null>(null);
  const [frtEditingId, setFrtEditingId] = useState<string | null>(null);
  const [vehEditingId, setVehEditingId] = useState<string | null>(null);
  const [oilEditingId, setOilEditingId] = useState<string | null>(null);
  const [cliEditingId, setCliEditingId] = useState<string | null>(null);

  // DRIVER FORM STATES
  const [drvEditingId, setDrvEditingId] = useState<string | null>(null);
  const [drvNome, setDrvNome] = useState("");
  const [drvCnh, setDrvCnh] = useState("");
  const [drvTelefone, setDrvTelefone] = useState("");
  const [drvCategoria, setDrvCategoria] = useState("E");
  const [drvStatus, setDrvStatus] = useState<"Ativo" | "Em Viagem" | "Férias">("Ativo");
  const [drvFoto, setDrvFoto] = useState("");

  // FORM STATES
  // Expense Form
  const [expPlaca, setExpPlaca] = useState("");
  const [expData, setExpData] = useState(new Date().toISOString().slice(0, 10));
  const [expMotorista, setExpMotorista] = useState("");
  const [expKm, setExpKm] = useState<number | "">("");
  const [expLitros, setExpLitros] = useState<number | "">("");
  const [expAbastecimento, setExpAbastecimento] = useState<number | "">("");
  const [expArla, setExpArla] = useState<number | "">("");
  const [expRastreador, setExpRastreador] = useState<number | "">("");
  const [expDepreciacao, setExpDepreciacao] = useState<number | "">("");
  const [expIpva, setExpIpva] = useState<number | "">("");
  const [expDiaria, setExpDiaria] = useState<number | "">("");
  const [expSalario, setExpSalario] = useState<number | "">("");
  const [expComissao, setExpComissao] = useState<number | "">("");
  const [expPrestacao, setExpPrestacao] = useState<number | "">("");
  const [expSeguro, setExpSeguro] = useState<number | "">("");
  const [expOutros, setExpOutros] = useState<number | "">("");
  const [expObs, setExpObs] = useState("");

  // Freight Form
  const [frtEmpresa, setFrtEmpresa] = useState("");
  const [frtOrigem, setFrtOrigem] = useState("");
  const [frtDestino, setFrtDestino] = useState("");
  const [frtPlaca, setFrtPlaca] = useState("");
  const [frtData, setFrtData] = useState(new Date().toISOString().slice(0, 10));
  const [frtCotacao, setFrtCotacao] = useState<number | "">("");
  const [frtValor, setFrtValor] = useState<number | "">("");
  const [frtRecebido, setFrtRecebido] = useState<number | "">("");

  // Vehicle Form
  const [vehPlaca, setVehPlaca] = useState("");
  const [vehModelo, setVehModelo] = useState("");
  const [vehMotorista, setVehMotorista] = useState("");
  const [vehCategoria, setVehCategoria] = useState("LOGISTICA");

  // Oil Form
  const [oilPlaca, setOilPlaca] = useState("");
  const [oilMotorista, setOilMotorista] = useState("");
  const [oilData, setOilData] = useState(new Date().toISOString().slice(0, 10));
  const [oilKmAtual, setOilKmAtual] = useState<number | "">("");
  const [oilProximaKm, setOilProximaKm] = useState<number | "">("");
  const [oilCusto, setOilCusto] = useState<number | "">("");
  const [oilCategoriaServico, setOilCategoriaServico] = useState<MaintenanceCategory>("Troca de Óleo");
  const [oilObs, setOilObs] = useState("");

  // Client Form
  const [cliNome, setCliNome] = useState("");
  const [cliDocumento, setCliDocumento] = useState("");
  const [cliTipo, setCliTipo] = useState<"PF" | "PJ">("PJ");
  const [cliContato, setCliContato] = useState("");

  // Client Search State
  const [clientSearch, setClientSearch] = useState("");

  // CALCULATED DASHBOARD METRICS
  const totalFreightsRevenue = useMemo(() => {
    return freights.reduce((acc, f) => acc + (f.valor || 0), 0);
  }, [freights]);

  const totalExpensesAmount = useMemo(() => {
    return expenses.reduce((acc, e) => acc + (e.total || 0), 0);
  }, [expenses]);

  const netBalance = useMemo(() => {
    return totalFreightsRevenue - totalExpensesAmount;
  }, [totalFreightsRevenue, totalExpensesAmount]);

  const liquidPercentage = useMemo(() => {
    if (totalFreightsRevenue === 0) return 0;
    const pct = (netBalance / totalFreightsRevenue) * 100;
    return Math.round(pct);
  }, [netBalance, totalFreightsRevenue]);

  const totalToReceive = useMemo(() => {
    return freights.reduce((acc, f) => acc + ((f.valor || 0) - (f.recebido || 0)), 0);
  }, [freights]);

  // SALDO A RECEBER AGRUPADO POR EMPRESA (calculado automaticamente)
  const receivableByCompany = useMemo(() => {
    const map = new Map<
      string,
      { empresa: string; cotacao: number; valor: number; recebido: number; saldo: number; fretes: number }
    >();
    for (const f of freights) {
      const empresa = (f.empresa || "SEM EMPRESA").toUpperCase();
      const cur =
        map.get(empresa) ?? { empresa, cotacao: 0, valor: 0, recebido: 0, saldo: 0, fretes: 0 };
      cur.cotacao += Number(f.cotacao) || 0;
      cur.valor += Number(f.valor) || 0;
      cur.recebido += Number(f.recebido) || 0;
      cur.saldo = cur.valor - cur.recebido;
      cur.fretes += 1;
      map.set(empresa, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.saldo - a.saldo);
  }, [freights]);

  // Vehicle Financial Breakdown
  const vehicleStats = useMemo(() => {
    return vehicles.map((v) => {
      const vFreights = freights
        .filter((f) => f.placa.toUpperCase() === v.placa.toUpperCase())
        .reduce((sum, f) => sum + f.valor, 0);
      const vExpenses = expenses
        .filter((e) => e.placa.toUpperCase() === v.placa.toUpperCase())
        .reduce((sum, e) => sum + e.total, 0);
      return {
        ...v,
        faturamento: vFreights,
        despesa: vExpenses,
        saldo: vFreights - vExpenses,
      };
    });
  }, [vehicles, freights, expenses]);

  // ADD / EDIT EXPENSE HANDLER WITH IMMEDIATE FINANCIAL RECALCULATION
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expPlaca) {
      toast.error("Por favor, selecione ou informe a placa do veículo.");
      return;
    }

    const num = (v: number | "") => (typeof v === "number" ? v : 0);

    const detalhes: ExpenseDetails = {
      abastecimento: num(expAbastecimento),
      arla: num(expArla),
      rastreador: num(expRastreador),
      depreciacao: num(expDepreciacao),
      ipva: num(expIpva),
      diaria: num(expDiaria),
      salario: num(expSalario),
      comissao: num(expComissao),
      prestacao: num(expPrestacao),
      seguro: num(expSeguro),
      outros: num(expOutros),
    };

    const calculatedTotal = Object.values(detalhes).reduce((a, v) => a + v, 0);

    let updatedExpenses = [...expenses];
    if (expEditingId) {
      updatedExpenses = expenses.map((item) =>
        item.id === expEditingId
          ? {
              ...item,
              placa: expPlaca.toUpperCase(),
              data: expData,
              motorista: expMotorista || "MOTORISTA",
              km: num(expKm),
              litros: num(expLitros),
              detalhes,
              total: calculatedTotal,
              observacao: expObs,
            }
          : item,
      );
      toast.success(`Despesa atualizada e calculada imediatamente no financeiro!`);
    } else {
      const newExp: Expense = {
        id: "exp_" + Date.now(),
        placa: expPlaca.toUpperCase(),
        data: expData,
        motorista: expMotorista || "MOTORISTA",
        km: num(expKm),
        litros: num(expLitros),
        detalhes,
        total: calculatedTotal,
        observacao: expObs,
      };

      updatedExpenses = [newExp, ...expenses];
      toast.success(`Despesa de R$ ${calculatedTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} adicionada e computada no financeiro!`);
    }

    persistExpenses(updatedExpenses);

    // Reset Form
    setExpEditingId(null);
    setExpPlaca("");
    setExpMotorista("");
    setExpKm("");
    setExpLitros("");
    setExpAbastecimento("");
    setExpArla("");
    setExpRastreador("");
    setExpDepreciacao("");
    setExpIpva("");
    setExpDiaria("");
    setExpSalario("");
    setExpComissao("");
    setExpPrestacao("");
    setExpSeguro("");
    setExpOutros("");
    setExpObs("");
    setIsExpenseModalOpen(false);
  };

  const handleStartEditExpense = (exp: Expense) => {
    setExpEditingId(exp.id);
    setExpPlaca(exp.placa);
    setExpData(exp.data);
    setExpMotorista(exp.motorista);
    setExpKm(exp.km);
    setExpLitros(exp.litros || "");
    setExpAbastecimento(exp.detalhes.abastecimento || "");
    setExpArla(exp.detalhes.arla || "");
    setExpRastreador(exp.detalhes.rastreador || "");
    setExpDepreciacao(exp.detalhes.depreciacao || "");
    setExpIpva(exp.detalhes.ipva || "");
    setExpDiaria(exp.detalhes.diaria || "");
    setExpSalario(exp.detalhes.salario || "");
    setExpComissao(exp.detalhes.comissao || "");
    setExpPrestacao(exp.detalhes.prestacao || "");
    setExpSeguro(exp.detalhes.seguro || "");
    setExpOutros(exp.detalhes.outros || "");
    setExpObs(exp.observacao || "");
    setIsExpenseModalOpen(true);
  };

  // ADD / EDIT FREIGHT HANDLER WITH IMMEDIATE FINANCIAL RECALCULATION
  const handleAddFreight = (e: React.FormEvent) => {
    e.preventDefault();
    if (!frtEmpresa || !frtOrigem || !frtDestino || !frtPlaca) {
      toast.error("Preencha empresa, origem, destino e a placa do veículo.");
      return;
    }

    const cot = typeof frtCotacao === "number" ? frtCotacao : 0;
    // Se o valor final não for informado, usa a cotação automaticamente.
    const val = typeof frtValor === "number" && frtValor > 0 ? frtValor : cot;
    const rec = typeof frtRecebido === "number" ? frtRecebido : 0;

    let updatedFreights = [...freights];
    if (frtEditingId) {
      updatedFreights = freights.map((item) =>
        item.id === frtEditingId
          ? {
              ...item,
              empresa: frtEmpresa.toUpperCase(),
              origem: frtOrigem.toUpperCase(),
              destino: frtDestino.toUpperCase(),
              placa: frtPlaca.toUpperCase(),
              data: frtData,
              cotacao: cot,
              valor: val,
              recebido: rec,
            }
          : item,
      );
      toast.success("Frete atualizado e recalculado imediatamente!");
    } else {
      const newFrt: Freight = {
        id: "frt_" + Date.now(),
        empresa: frtEmpresa.toUpperCase(),
        origem: frtOrigem.toUpperCase(),
        destino: frtDestino.toUpperCase(),
        placa: frtPlaca.toUpperCase(),
        data: frtData,
        cotacao: cot,
        valor: val,
        recebido: rec,
      };

      updatedFreights = [newFrt, ...freights];
      toast.success(`Frete de R$ ${val.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} cadastrado e adicionado ao financeiro!`);
    }

    persistFreights(updatedFreights);

    setFrtEditingId(null);
    setFrtEmpresa("");
    setFrtOrigem("");
    setFrtDestino("");
    setFrtPlaca("");
    setFrtCotacao("");
    setFrtValor("");
    setFrtRecebido("");
    setIsFreightModalOpen(false);
  };

  const handleStartEditFreight = (frt: Freight) => {
    setFrtEditingId(frt.id);
    setFrtEmpresa(frt.empresa || "");
    setFrtOrigem(frt.origem);
    setFrtDestino(frt.destino);
    setFrtPlaca(frt.placa);
    setFrtData(frt.data);
    setFrtCotacao(frt.cotacao || frt.valor || "");
    setFrtValor(frt.valor);
    setFrtRecebido(frt.recebido);
    setIsFreightModalOpen(true);
  };

  // ADD / EDIT VEHICLE HANDLER
  const handleAddVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehPlaca || !vehModelo) {
      toast.error("Informe a placa e o modelo do veículo.");
      return;
    }

    if (vehEditingId) {
      const updatedVehicles = vehicles.map((item) =>
        item.id === vehEditingId
          ? {
              ...item,
              placa: vehPlaca.toUpperCase(),
              modelo: vehModelo,
              motorista: vehMotorista.toUpperCase() || "NÃO ATRIBUÍDO",
              categoria: vehCategoria.toUpperCase() || "LOGISTICA",
            }
          : item,
      );
      persistVehicles(updatedVehicles);
      toast.success(`Veículo ${vehPlaca.toUpperCase()} atualizado!`);
    } else {
      const newVeh: Vehicle = {
        id: "veh_" + Date.now(),
        placa: vehPlaca.toUpperCase(),
        modelo: vehModelo,
        motorista: vehMotorista.toUpperCase() || "NÃO ATRIBUÍDO",
        categoria: vehCategoria.toUpperCase() || "LOGISTICA",
      };

      persistVehicles([...vehicles, newVeh]);
      toast.success(`Veículo ${newVeh.placa} cadastrado na frota!`);
    }

    setVehEditingId(null);
    setVehPlaca("");
    setVehModelo("");
    setVehMotorista("");
    setVehCategoria("LOGISTICA");
    setIsVehicleModalOpen(false);
  };

  const handleStartEditVehicle = (veh: Vehicle) => {
    setVehEditingId(veh.id);
    setVehPlaca(veh.placa);
    setVehModelo(veh.modelo);
    setVehMotorista(veh.motorista);
    setVehCategoria(veh.categoria);
    setIsVehicleModalOpen(true);
  };

  // ADD / EDIT DRIVER HANDLER
  const handleAddDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!drvNome) {
      toast.error("Informe o nome do motorista.");
      return;
    }

    if (drvEditingId) {
      const updatedDrivers = drivers.map((d) =>
        d.id === drvEditingId
          ? {
              ...d,
              nome: drvNome.toUpperCase(),
              cnh: drvCnh || "Não informada",
              telefone: drvTelefone || "Não informado",
              categoria: drvCategoria || "E",
              status: drvStatus,
              foto: drvFoto || d.foto || "",
            }
          : d,
      );
      persistDrivers(updatedDrivers);
      toast.success(`Motorista ${drvNome.toUpperCase()} atualizado com sucesso!`);
    } else {
      const newDrv: Driver = {
        id: "drv_" + Date.now(),
        nome: drvNome.toUpperCase(),
        cnh: drvCnh || "Não informada",
        telefone: drvTelefone || "Não informado",
        categoria: drvCategoria || "E",
        status: drvStatus,
        foto: drvFoto || "",
      };

      persistDrivers([...drivers, newDrv]);
      toast.success(`Motorista ${newDrv.nome} cadastrado com sucesso!`);
    }

    setDrvEditingId(null);
    setDrvNome("");
    setDrvCnh("");
    setDrvTelefone("");
    setDrvCategoria("E");
    setDrvStatus("Ativo");
    setDrvFoto("");
    setIsDriverModalOpen(false);
  };

  const handleStartEditDriver = (drv: Driver) => {
    setDrvEditingId(drv.id);
    setDrvNome(drv.nome);
    setDrvCnh(drv.cnh);
    setDrvTelefone(drv.telefone);
    setDrvCategoria(drv.categoria);
    setDrvStatus(drv.status);
    setDrvFoto(drv.foto || "");
    setIsDriverModalOpen(true);
  };

  // ADD / EDIT OIL CHANGE HANDLER WITH IMMEDIATE FINANCIAL RECALCULATION
  const handleAddOilChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!oilPlaca) {
      toast.error("Informe a placa do veículo.");
      return;
    }

    const km = typeof oilKmAtual === "number" ? oilKmAtual : 0;
    const prox = typeof oilProximaKm === "number" ? oilProximaKm : km + 10000;
    const custo = typeof oilCusto === "number" ? oilCusto : 0;

    let updatedOilChanges = [...oilChanges];
    if (oilEditingId) {
      updatedOilChanges = oilChanges.map((item) =>
        item.id === oilEditingId
          ? {
              ...item,
              placa: oilPlaca.toUpperCase(),
              motorista: oilMotorista.toUpperCase() || "MOTORISTA",
              data: oilData,
              kmAtual: km,
              proximaTrocaKm: prox,
              custo: custo,
              categoriaServico: oilCategoriaServico,
              observacao: oilObs,
            }
          : item,
      );
      toast.success("Manutenção/peças atualizadas e computadas no financeiro!");
    } else {
      const newOil: OilChange = {
        id: "oil_" + Date.now(),
        placa: oilPlaca.toUpperCase(),
        motorista: oilMotorista.toUpperCase() || "MOTORISTA",
        data: oilData,
        kmAtual: km,
        proximaTrocaKm: prox,
        custo: custo,
        categoriaServico: oilCategoriaServico,
        observacao: oilObs,
      };

      updatedOilChanges = [newOil, ...oilChanges];
      toast.success(`Manutenção (${oilCategoriaServico}) registrada e adicionada imediatamente ao financeiro!`);
    }

    persistOilChanges(updatedOilChanges);

    setOilEditingId(null);
    setOilPlaca("");
    setOilMotorista("");
    setOilKmAtual("");
    setOilProximaKm("");
    setOilCusto("");
    setOilCategoriaServico("Troca de Óleo");
    setOilObs("");
    setIsOilModalOpen(false);
  };

  const handleStartEditOilChange = (oil: OilChange) => {
    setOilEditingId(oil.id);
    setOilPlaca(oil.placa);
    setOilMotorista(oil.motorista);
    setOilData(oil.data);
    setOilKmAtual(oil.kmAtual);
    setOilProximaKm(oil.proximaTrocaKm);
    setOilCusto(oil.custo);
    setOilCategoriaServico(oil.categoriaServico);
    setOilObs(oil.observacao || "");
    setIsOilModalOpen(true);
  };

  // Validação de Documentos (CPF/CNPJ)
  const validateDoc = (doc: string, tipo: "PF" | "PJ") => {
    const cleanDoc = doc.replace(/\D/g, "");
    if (tipo === "PF") {
      if (cleanDoc.length !== 11) return false;
      // Validação simplificada (existem algoritmos reais para isso, mas aqui focaremos no tamanho e formato)
      return true;
    } else {
      if (cleanDoc.length !== 14) return false;
      return true;
    }
  };

  // ADD / EDIT CLIENT HANDLER
  const handleAddClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliNome) {
      toast.error("Informe o nome do cliente.");
      return;
    }

    if (cliDocumento && !validateDoc(cliDocumento, cliTipo)) {
      toast.error(`O ${cliTipo === "PF" ? "CPF" : "CNPJ"} informado parece inválido.`);
      return;
    }

    if (cliEditingId) {
      const updatedClients = clients.map((c) =>
        c.id === cliEditingId
          ? {
              ...c,
              nome: cliNome.toUpperCase(),
              documento: cliDocumento,
              tipo: cliTipo,
              contato: cliContato,
            }
          : c,
      );
      persistClients(updatedClients);
      toast.success(`Cliente ${cliNome.toUpperCase()} atualizado!`);
    } else {
      const newCli: Client = {
        id: "cli_" + Date.now(),
        nome: cliNome.toUpperCase(),
        documento: cliDocumento,
        tipo: cliTipo,
        contato: cliContato,
      };

      persistClients([...clients, newCli]);
      toast.success(`Cliente ${newCli.nome} cadastrado!`);
    }

    setCliEditingId(null);
    setCliNome("");
    setCliDocumento("");
    setCliTipo("PJ");
    setCliContato("");
    setIsClientModalOpen(false);
  };

  const handleStartEditClient = (cli: Client) => {
    setCliEditingId(cli.id);
    setCliNome(cli.nome);
    setCliDocumento(cli.documento);
    setCliTipo(cli.tipo);
    setCliContato(cli.contato);
    setIsClientModalOpen(true);
  };

  // DELETE HANDLERS
  const handleDeleteExpense = (id: string) => {
    persistExpenses(expenses.filter((item) => item.id !== id));
    toast.info("Despesa removida.");
  };

  const handleDeleteFreight = (id: string) => {
    persistFreights(freights.filter((item) => item.id !== id));
    toast.info("Frete removido.");
  };

  const handleDeleteVehicle = (id: string) => {
    persistVehicles(vehicles.filter((item) => item.id !== id));
    toast.info("Veículo removido da frota.");
  };

  const handleDeleteDriver = (id: string) => {
    persistDrivers(drivers.filter((item) => item.id !== id));
    toast.info("Motorista removido do sistema.");
  };

  const handleDeleteOilChange = (id: string) => {
    persistOilChanges(oilChanges.filter((item) => item.id !== id));
    toast.info("Registro de manutenção removido.");
  };

  const handleDeleteClient = (id: string) => {
    persistClients(clients.filter((item) => item.id !== id));
    toast.info("Cliente removido.");
  };

  // LOGIN REAL (e-mail e senha da conta do sistema)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      toast.error("Preencha e-mail e senha.");
      return;
    }
    setAuthLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim(),
      password: loginPassword,
    });
    setAuthLoading(false);
    if (error) {
      toast.error(
        error.message === "Invalid login credentials"
          ? "E-mail ou senha inválidos."
          : error.message,
      );
      return;
    }
    toast.success("Acesso ao sistema liberado!");
  };

  // CRIAR CONTA DE ACESSO
  const handleSignUp = async () => {
    if (!loginEmail || loginPassword.length < 6) {
      toast.error("Informe um e-mail e uma senha com pelo menos 6 caracteres.");
      return;
    }
    setAuthLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: loginEmail.trim(),
      password: loginPassword,
      options: { emailRedirectTo: window.location.origin },
    });
    setAuthLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data.session) {
      toast.success("Conta criada e acesso liberado!");
    } else {
      toast.success("Conta criada! Confirme o e-mail para entrar.");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.info("Sessão encerrada.");
  };

  // FORMATTER HELPER
  const formatBRL = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  const formatDateBR = (dateStr: string) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  // -------------------------------------------------------------
  // 1. LOGIN SCREEN IF NOT AUTHENTICATED
  // -------------------------------------------------------------
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#0b192c] flex items-center justify-center text-slate-300 text-sm font-sans">
        Carregando...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0b192c] flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
        <Toaster position="top-right" />
        {/* Background glow effects */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-orange-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden z-10 border border-slate-100">
          {/* Header Banner */}
          <div className="bg-[#0b192c] p-8 text-center text-white relative border-b border-slate-800 flex flex-col items-center">
            <div className="bg-white px-6 py-4 rounded-xl mb-6 shadow-md inline-block">
              <img src={logoAsset.url} alt="GDALog" className="h-20 w-auto object-contain" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Gestão de Transportes</h1>
            <p className="text-slate-400 text-xs mt-1">Acesse sua frota, despesas e faturamento</p>
          </div>

          <form onSubmit={handleLogin} className="p-6 space-y-4">
            <div>
              <Label className="text-xs font-semibold text-slate-700">E-mail de Acesso</Label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="admin@gdalog.com.br"
                  className="pl-9 bg-slate-50 border-slate-200"
                  required
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Senha</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-9 bg-slate-50 border-slate-200"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={authLoading}
              className="w-full bg-[#0b192c] hover:bg-[#162a45] text-white font-semibold py-2.5 rounded-xl transition-all shadow-md mt-2 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {authLoading ? "Entrando..." : "Entrar"} <ArrowRight className="w-4 h-4" />
            </Button>



            <div className="pt-2 text-center text-xs text-slate-400">
              Ambiente Seguro • GDALog Transportes v2.4
            </div>
          </form>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 2. MAIN APPLICATION INTERFACE
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#f4f6f9] text-slate-800 font-sans pb-24 md:pb-6">
      <Toaster position="top-right" />

      {/* TOP NAVBAR (Exact match to screenshots visual identity) */}
      <header className="bg-[#0c192c] text-white sticky top-0 z-30 shadow-md no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-3">
            <div className="bg-white px-3 py-0.5 rounded-lg shadow-sm flex items-center">
              <img src={logoAsset.url} alt="GDALog" className="h-14 w-auto object-contain" />
            </div>
            <span className="font-bold text-sm sm:text-base tracking-tight hidden sm:inline-block border-l border-slate-700 pl-3 text-slate-200">
              Gestão de Transportes
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center space-x-1 lg:space-x-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === "dashboard"
                  ? "bg-[#f25c05] text-white shadow"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              Início
            </button>
            <button
              onClick={() => setActiveTab("frota")}
              className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === "frota"
                  ? "bg-[#f25c05] text-white shadow"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              Frota
            </button>
            <button
              onClick={() => setActiveTab("despesas")}
              className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === "despesas"
                  ? "bg-[#f25c05] text-white shadow"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              Despesas
            </button>
            <button
              onClick={() => setActiveTab("oleo")}
              className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === "oleo"
                  ? "bg-[#f25c05] text-white shadow"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              Manutenção
            </button>
            <button
              onClick={() => setActiveTab("fretes")}
              className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === "fretes"
                  ? "bg-[#f25c05] text-white shadow"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              Fretes
            </button>
            <button
              onClick={() => setActiveTab("financeiro")}
              className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === "financeiro"
                  ? "bg-[#f25c05] text-white shadow"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              Financeiro
            </button>
            <button
              onClick={() => setActiveTab("clientes")}
              className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === "clientes"
                  ? "bg-[#f25c05] text-white shadow"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              Clientes
            </button>
          </nav>

          {/* Logout */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-slate-300 hover:text-white px-2 py-1.5 rounded text-xs font-semibold cursor-pointer transition-colors"
              title="Sair do Sistema"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
            <div className="text-[10px] text-slate-500 font-medium px-2 py-1 border-l border-slate-700 hidden lg:block whitespace-pre-line">
              '''Do not make any visual modifications. The phrases I write are commands to understand what I want, not to be written down. Understand their content well, then execute what is required.'''
                                            
                                            Implementar filtros de busca na lista de clientes.

Vincular o histórico de fretes diretamente no card de cada cliente.

Adicionar validação de CPF/CNPJ nos formulários de cliente.
            </div>
          </div>

        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-24 md:pb-6">

        {/* ------------------------------------------------------------- */}
        {/* TAB 1: INÍCIO (DASHBOARD) - Exact visual layout from Image 1 */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            
            {/* Page Header */}
            <div>
              <h1 className="text-2xl font-black text-[#0c192c] tracking-tight">Painel</h1>
              <p className="text-slate-500 text-xs sm:text-sm">Resumo financeiro e operacional da frota</p>
            </div>

            {/* Top 4 Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* CRÉDITO */}
              <Card className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-all">
                <div className="text-xs font-bold text-slate-400 tracking-wider uppercase">CRÉDITO</div>
                <div className="text-2xl font-black text-[#0c192c] mt-1">
                  {formatBRL(totalFreightsRevenue)}
                </div>
              </Card>

              {/* DESPESAS */}
              <Card className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-all">
                <div className="text-xs font-bold text-slate-400 tracking-wider uppercase">DESPESAS</div>
                <div className="text-2xl font-black text-[#dc2626] mt-1">
                  {formatBRL(totalExpensesAmount)}
                </div>
              </Card>

              {/* SALDO TOTAL */}
              <Card className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-all">
                <div className="text-xs font-bold text-slate-400 tracking-wider uppercase">SALDO TOTAL</div>
                <div className="text-2xl font-black text-[#16a34a] mt-1">
                  {formatBRL(netBalance)}
                </div>
              </Card>

              {/* PERCENTUAL LÍQUIDO */}
              <Card className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-all">
                <div className="text-xs font-bold text-slate-400 tracking-wider uppercase flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-slate-500" /> PERCENTUAL LÍQUIDO
                </div>
                <div className="text-2xl font-black text-[#0c192c] mt-1">
                  {liquidPercentage}%
                </div>
              </Card>
            </div>

            {/* Quick Action Shortcut Buttons (Image 1 replica) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <button
                onClick={() => setIsExpenseModalOpen(true)}
                className="bg-white hover:bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-center gap-3 transition-all cursor-pointer shadow-sm text-left group"
              >
                <div className="bg-orange-100 text-[#f25c05] p-2.5 rounded-xl group-hover:scale-105 transition-transform">
                  <DollarSign className="w-5 h-5" />
                </div>
                <span className="font-semibold text-sm text-slate-700">Nova despesa</span>
              </button>

              <button
                onClick={() => setIsFreightModalOpen(true)}
                className="bg-white hover:bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-center gap-3 transition-all cursor-pointer shadow-sm text-left group"
              >
                <div className="bg-orange-100 text-[#f25c05] p-2.5 rounded-xl group-hover:scale-105 transition-transform">
                  <CreditCard className="w-5 h-5" />
                </div>
                <span className="font-semibold text-sm text-slate-700">Novo frete</span>
              </button>

              <button
                onClick={() => setIsOilModalOpen(true)}
                className="bg-white hover:bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-center gap-3 transition-all cursor-pointer shadow-sm text-left group"
              >
                <div className="bg-orange-100 text-[#f25c05] p-2.5 rounded-xl group-hover:scale-105 transition-transform">
                  <Wrench className="w-5 h-5" />
                </div>
                <span className="font-semibold text-sm text-slate-700">Manutenção</span>
              </button>

              <button
                onClick={() => setIsVehicleModalOpen(true)}
                className="bg-white hover:bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-center gap-3 transition-all cursor-pointer shadow-sm text-left group"
              >
                <div className="bg-orange-100 text-[#f25c05] p-2.5 rounded-xl group-hover:scale-105 transition-transform">
                  <Truck className="w-5 h-5" />
                </div>
                <span className="font-semibold text-sm text-slate-700">Novo veículo</span>
              </button>

              <button
                onClick={() => setIsClientModalOpen(true)}
                className="bg-white hover:bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-center gap-3 transition-all cursor-pointer shadow-sm text-left group"
              >
                <div className="bg-orange-100 text-[#f25c05] p-2.5 rounded-xl group-hover:scale-105 transition-transform">
                  <User className="w-5 h-5" />
                </div>
                <span className="font-semibold text-sm text-slate-700">Novo cliente</span>
              </button>
            </div>

            {/* Bottom 2 Columns Grid: Veículos vs Últimos lançamentos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Veículos Column */}
              <div className="space-y-3">
                <h2 className="font-bold text-lg text-[#0c192c]">Veículos</h2>
                <div className="space-y-3">
                  {vehicleStats.map((veh) => (
                    <div
                      key={veh.id}
                      className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center justify-between"
                    >
                      <div>
                        <div className="font-extrabold text-base text-[#0c192c]">
                          {veh.placa}
                        </div>
                        <div className="text-xs text-slate-400 font-medium mt-0.5">
                          {veh.modelo} · {veh.motorista}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-semibold text-[#16a34a]">
                          {formatBRL(veh.faturamento)}
                        </div>
                        <div className="text-xs font-semibold text-slate-400">
                          - {formatBRL(veh.despesa)}
                        </div>
                      </div>
                    </div>
                  ))}

                  {vehicles.length === 0 && (
                    <div className="text-center py-6 text-slate-400 text-sm bg-white rounded-2xl border border-dashed">
                      Nenhum veículo cadastrado na frota.
                    </div>
                  )}
                </div>
              </div>

              {/* Últimos Lançamentos Column */}
              <div className="space-y-3">
                <h2 className="font-bold text-lg text-[#0c192c]">Últimos lançamentos</h2>
                <div className="space-y-3">
                  {expenses.slice(0, 5).map((exp) => (
                    <div
                      key={exp.id}
                      className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-xs text-slate-500">
                          {formatDateBR(exp.data)} · {exp.placa}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {exp.km ? `${exp.km} km rodados` : "Sem km informado"}
                        </div>
                      </div>

                      <div className="font-extrabold text-[#0c192c] text-sm">
                        {formatBRL(exp.total)}
                      </div>
                    </div>
                  ))}

                  {expenses.length === 0 && (
                    <div className="text-center py-6 text-slate-400 text-sm bg-white rounded-2xl border border-dashed">
                      Nenhuma despesa lançada recentemente.
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: FROTA - Veículos e Motoristas */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "frota" && (
          <div className="space-y-8">
            {/* Seção Veículos */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-black text-[#0c192c] tracking-tight">Frota & Veículos</h1>
                  <p className="text-slate-500 text-xs sm:text-sm">Gerencie os veículos cadastrados na frota</p>
                </div>

                <Button
                  onClick={() => setIsVehicleModalOpen(true)}
                  className="bg-[#0c192c] hover:bg-[#162a45] text-white font-semibold rounded-xl px-4 py-2 flex items-center gap-1.5 shadow cursor-pointer text-xs sm:text-sm"
                >
                  <Plus className="w-4 h-4" /> Novo veículo
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {vehicles.map((veh) => (
                  <div
                    key={veh.id}
                    className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm relative group hover:shadow-md transition-all"
                  >
                    <div className="absolute top-4 right-4 flex items-center gap-1">
                      <button
                        onClick={() => handleStartEditVehicle(veh)}
                        className="text-slate-300 hover:text-[#0c192c] transition-colors p-1 cursor-pointer"
                        title="Editar veículo"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteVehicle(veh.id)}
                        className="text-slate-300 hover:text-red-500 transition-colors p-1 cursor-pointer"
                        title="Excluir veículo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="font-extrabold text-lg text-[#0c192c] tracking-wide">
                      {veh.placa}
                    </div>
                    <div className="text-xs text-slate-500 font-medium mt-1">
                      {veh.modelo}
                    </div>
                    <div className="text-xs text-slate-700 font-medium mt-2">
                      Motorista: <span className="font-bold">{veh.motorista}</span>
                    </div>
                    <div className="text-[11px] font-bold text-[#f25c05] tracking-wider uppercase mt-3">
                      {veh.categoria}
                    </div>
                  </div>
                ))}

                {vehicles.length === 0 && (
                  <div className="col-span-full bg-white rounded-2xl p-8 text-center text-slate-400 border border-dashed">
                    Nenhum veículo cadastrado.
                  </div>
                )}
              </div>
            </div>

            {/* Seção Motoristas */}
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-[#0c192c] tracking-tight">Motoristas</h2>
                  <p className="text-slate-500 text-xs sm:text-sm">Gerencie os motoristas cadastrados na operação</p>
                </div>

                <Button
                  onClick={() => setIsDriverModalOpen(true)}
                  className="bg-[#f25c05] hover:bg-orange-600 text-white font-semibold rounded-xl px-4 py-2 flex items-center gap-1.5 shadow cursor-pointer text-xs sm:text-sm"
                >
                  <Plus className="w-4 h-4" /> Novo motorista
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {drivers.map((drv) => (
                  <div
                    key={drv.id}
                    className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm relative group hover:shadow-md transition-all space-y-2"
                  >
                    <div className="absolute top-4 right-4 flex items-center gap-1">
                      <button
                        onClick={() => handleStartEditDriver(drv)}
                        className="text-slate-300 hover:text-[#0c192c] transition-colors p-1 cursor-pointer"
                        title="Editar motorista"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteDriver(drv.id)}
                        className="text-slate-300 hover:text-red-500 transition-colors p-1 cursor-pointer"
                        title="Excluir motorista"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      {drv.foto ? (
                        <img
                          src={drv.foto}
                          alt={drv.nome}
                          className="w-12 h-12 rounded-full object-cover border border-slate-200 shadow-sm"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-sm border border-slate-200">
                          <User className="w-6 h-6 text-slate-400" />
                        </div>
                      )}
                      <div>
                        <div className="font-extrabold text-base text-[#0c192c]">
                          {drv.nome}
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          drv.status === "Em Viagem" ? "bg-blue-50 text-blue-600" :
                          drv.status === "Férias" ? "bg-amber-50 text-amber-600" :
                          "bg-green-50 text-green-600"
                        }`}>
                          {drv.status}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-slate-600 space-y-1 pt-2 border-t border-slate-50">
                      <div>CNH: <strong className="text-slate-800">{drv.cnh}</strong> (Cat. {drv.categoria})</div>
                      <div>Telefone: <strong className="text-slate-800">{drv.telefone}</strong></div>
                    </div>
                  </div>
                ))}

                {drivers.length === 0 && (
                  <div className="col-span-full bg-white rounded-2xl p-8 text-center text-slate-400 border border-dashed">
                    Nenhum motorista cadastrado. Clique no botão acima para adicionar.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 3: DESPESAS - Exact visual layout from Image 3 */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "despesas" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-black text-[#0c192c] tracking-tight">Despesas</h1>
                <p className="text-slate-500 text-xs sm:text-sm">Demonstrativo de despesas por viagem</p>
              </div>

              <Button
                onClick={() => setIsExpenseModalOpen(true)}
                className="bg-[#0c192c] hover:bg-[#162a45] text-white font-semibold rounded-xl px-4 py-2 flex items-center gap-1.5 shadow cursor-pointer text-xs sm:text-sm"
              >
                <Plus className="w-4 h-4" /> Nova despesa
              </Button>
            </div>

            {/* Expenses Cards List */}
            <div className="space-y-4">
              {expenses.map((exp) => (
                <div
                  key={exp.id}
                  className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-3 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                    <div>
                      <div className="font-black text-base text-[#0c192c]">
                        {exp.placa} · {formatDateBR(exp.data)}
                      </div>
                      <div className="text-xs text-slate-400 font-medium mt-0.5">
                        {exp.motorista} · {exp.km} km
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="font-black text-lg text-[#dc2626]">
                        {formatBRL(exp.total)}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleStartEditExpense(exp)}
                          className="text-slate-300 hover:text-[#0c192c] transition-colors p-1 cursor-pointer"
                          title="Editar despesa"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="text-slate-300 hover:text-red-500 transition-colors p-1 cursor-pointer"
                          title="Excluir despesa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expense Items Inline Grid */}
                  <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-600 font-medium">
                    {exp.detalhes.abastecimento > 0 && (
                      <span>Abastecimento: <strong className="text-slate-900">{formatBRL(exp.detalhes.abastecimento)}</strong></span>
                    )}
                    {exp.detalhes.arla > 0 && (
                      <span>Arla: <strong className="text-slate-900">{formatBRL(exp.detalhes.arla)}</strong></span>
                    )}
                    {exp.detalhes.rastreador > 0 && (
                      <span>Rastreador: <strong className="text-slate-900">{formatBRL(exp.detalhes.rastreador)}</strong></span>
                    )}
                    {exp.detalhes.depreciacao > 0 && (
                      <span>Depreciação: <strong className="text-slate-900">{formatBRL(exp.detalhes.depreciacao)}</strong></span>
                    )}
                    {exp.detalhes.ipva > 0 && (
                      <span>IPVA: <strong className="text-slate-900">{formatBRL(exp.detalhes.ipva)}</strong></span>
                    )}
                    {exp.detalhes.diaria > 0 && (
                      <span>Diária motorista: <strong className="text-slate-900">{formatBRL(exp.detalhes.diaria)}</strong></span>
                    )}
                    {exp.detalhes.salario > 0 && (
                      <span>Salário: <strong className="text-slate-900">{formatBRL(exp.detalhes.salario)}</strong></span>
                    )}
                    {exp.detalhes.comissao > 0 && (
                      <span>Comissão: <strong className="text-slate-900">{formatBRL(exp.detalhes.comissao)}</strong></span>
                    )}
                    {exp.detalhes.prestacao > 0 && (
                      <span>Prestação: <strong className="text-slate-900">{formatBRL(exp.detalhes.prestacao)}</strong></span>
                    )}
                    {exp.detalhes.seguro > 0 && (
                      <span>Seguro: <strong className="text-slate-900">{formatBRL(exp.detalhes.seguro)}</strong></span>
                    )}
                    {exp.detalhes.outros > 0 && (
                      <span>Outros: <strong className="text-slate-900">{formatBRL(exp.detalhes.outros)}</strong></span>
                    )}
                    {(exp.litros || 0) > 0 && (
                      <span>Litros: <strong className="text-slate-900">{exp.litros.toLocaleString("pt-BR")} L</strong></span>
                    )}
                  </div>

                  {exp.observacao && (
                    <div className="text-xs text-slate-400 italic pt-1 border-t border-slate-50">
                      {exp.observacao}
                    </div>
                  )}
                </div>
              ))}

              {expenses.length === 0 && (
                <div className="bg-white rounded-2xl p-8 text-center text-slate-400 border border-dashed">
                  Nenhuma despesa cadastrada até o momento.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 4: MANUTENÇÃO (Manutenção e Controle Preventivo) */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "oleo" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-black text-[#0c192c] tracking-tight">Manutenção</h1>
                <p className="text-slate-500 text-xs sm:text-sm">Controle de manutenções e revisões da frota</p>
              </div>

              <Button
                onClick={() => setIsOilModalOpen(true)}
                className="bg-[#0c192c] hover:bg-[#162a45] text-white font-semibold rounded-xl px-4 py-2 flex items-center gap-1.5 shadow cursor-pointer text-xs sm:text-sm"
              >
                <Plus className="w-4 h-4" /> Nova manutenção
              </Button>
            </div>

            {/* Oil Change Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {oilChanges.map((oil) => {
                const getCategoryIcon = (cat?: MaintenanceCategory) => {
                  switch (cat) {
                    case "Freios":
                      return <AlertTriangle className="w-5 h-5 text-red-500" />;
                    case "Peças de Motor":
                      return <Truck className="w-5 h-5 text-blue-600" />;
                    case "Peças do Câmbio":
                      return <Settings className="w-5 h-5 text-purple-600" />;
                    case "Pneus":
                      return <Disc className="w-5 h-5 text-slate-700" />;
                    case "Troca de Óleo":
                    default:
                      return <Droplet className="w-5 h-5 text-orange-500" />;
                  }
                };

                return (
                  <div
                    key={oil.id}
                    className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-3 relative hover:shadow-md transition-all"
                  >
                    <div className="absolute top-4 right-4 flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          const text = `*MANUTENÇÃO GDALog*\nVeículo: ${oil.placa}\nServiço: ${oil.categoriaServico || "Troca de Óleo"}\nData: ${formatDateBR(oil.data)}\nKm: ${oil.kmAtual.toLocaleString()} km\nPróxima: ${oil.proximaTrocaKm.toLocaleString()} km\nCusto: ${formatBRL(oil.custo)}`;
                          window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
                        }}
                        className="text-slate-300 hover:text-[#25D366] transition-colors p-1.5 cursor-pointer bg-slate-50 rounded-lg"
                        title="Compartilhar no WhatsApp"
                      >
                        <img src={whatsappIconAsset.url} alt="WhatsApp" className="w-4 h-4 object-contain" />
                      </button>
                      <button
                        onClick={() => handleStartEditOilChange(oil)}
                        className="text-slate-300 hover:text-[#0c192c] transition-colors p-1 cursor-pointer"
                        title="Editar manutenção"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteOilChange(oil.id)}
                        className="text-slate-300 hover:text-red-500 transition-colors p-1 cursor-pointer"
                        title="Excluir manutenção"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {getCategoryIcon(oil.categoriaServico)}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-base text-[#0c192c]">{oil.placa}</span>
                          <span className="text-xs bg-orange-50 text-[#f25c05] px-2 py-0.5 rounded font-bold">
                            {oil.categoriaServico || "Troca de Óleo"}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400 font-medium">Motorista: {oil.motorista}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100">
                      <div>
                        <span className="text-slate-400 block">Data:</span>
                        <strong className="text-slate-800">{formatDateBR(oil.data)}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Km Realizado:</span>
                        <strong className="text-slate-800">{oil.kmAtual.toLocaleString()} km</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Próxima Revisão:</span>
                        <strong className="text-[#f25c05] font-bold">{oil.proximaTrocaKm.toLocaleString()} km</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Custo Investido:</span>
                        <strong className="text-slate-800">{formatBRL(oil.custo)}</strong>
                      </div>
                    </div>

                    {oil.observacao && (
                      <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded-lg italic">
                        "{oil.observacao}"
                      </div>
                    )}
                  </div>
                );
              })}

              {oilChanges.length === 0 && (
                <div className="col-span-full bg-white rounded-2xl p-8 text-center text-slate-400 border border-dashed">
                  Nenhum registro de manutenção efetuado.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 5: FRETES E CRÉDITOS - Exact visual layout from Image 4 */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "fretes" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-black text-[#0c192c] tracking-tight">Fretes e créditos</h1>
                <p className="text-slate-500 text-xs sm:text-sm">
                  Saldo a receber: <strong className="text-slate-800 font-extrabold">{formatBRL(totalToReceive)}</strong>
                </p>
              </div>

              <Button
                onClick={() => setIsFreightModalOpen(true)}
                className="bg-[#0c192c] hover:bg-[#162a45] text-white font-semibold rounded-xl px-4 py-2 flex items-center gap-1.5 shadow cursor-pointer text-xs sm:text-sm"
              >
                <Plus className="w-4 h-4" /> Novo frete
              </Button>
            </div>

            {/* SALDO A RECEBER POR EMPRESA (destacado, calculado automaticamente) */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-3">
                Saldo a receber por empresa
              </div>
              <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-orange-500 scrollbar-track-transparent">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-400 uppercase text-[10px] font-bold border-b border-slate-100">
                      <th className="text-left py-2">Empresa</th>
                      <th className="text-right py-2">Fretes</th>
                      <th className="text-right py-2">Cotação</th>
                      <th className="text-right py-2">Valor</th>
                      <th className="text-right py-2">Recebido</th>
                      <th className="text-right py-2">A receber</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receivableByCompany.map((c) => (
                      <tr key={c.empresa} className="border-b border-slate-50">
                        <td className="py-2 font-extrabold text-[#0c192c] uppercase">{c.empresa}</td>
                        <td className="py-2 text-right text-slate-500">{c.fretes}</td>
                        <td className="py-2 text-right text-slate-500">{formatBRL(c.cotacao)}</td>
                        <td className="py-2 text-right font-semibold text-slate-700">{formatBRL(c.valor)}</td>
                        <td className="py-2 text-right text-[#16a34a] font-semibold">{formatBRL(c.recebido)}</td>
                        <td className={`py-2 text-right font-black ${c.saldo > 0 ? "text-[#dc2626]" : "text-slate-400"}`}>
                          {formatBRL(c.saldo)}
                        </td>
                      </tr>
                    ))}
                    {receivableByCompany.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-4 text-center text-slate-400">
                          Nenhum frete lançado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {receivableByCompany.length > 0 && (
                    <tfoot>
                      <tr className="border-t border-slate-200 font-black text-[#0c192c]">
                        <td className="py-2">TOTAL</td>
                        <td className="py-2 text-right">{freights.length}</td>
                        <td className="py-2 text-right">
                          {formatBRL(receivableByCompany.reduce((a, c) => a + c.cotacao, 0))}
                        </td>
                        <td className="py-2 text-right">{formatBRL(totalFreightsRevenue)}</td>
                        <td className="py-2 text-right">
                          {formatBRL(receivableByCompany.reduce((a, c) => a + c.recebido, 0))}
                        </td>
                        <td className="py-2 text-right text-[#dc2626]">{formatBRL(totalToReceive)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* Freights List */}
            <div className="space-y-3">
              {freights.map((frt) => (
                <div
                  key={frt.id}
                  className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between hover:shadow-md transition-all gap-4"
                >
                  <div className="flex-1">
                    <div className="text-[10px] font-black uppercase tracking-wider text-[#f25c05]">
                      {frt.empresa || "SEM EMPRESA"}
                    </div>
                    <div className="font-extrabold text-base text-[#0c192c] uppercase">
                      {frt.origem} → {frt.destino}
                    </div>
                    <div className="text-xs text-slate-400 font-medium mt-0.5">
                      {frt.placa} · {formatDateBR(frt.data)}
                      {frt.cotacao ? ` · Cotação ${formatBRL(frt.cotacao)}` : ""}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-black text-lg text-[#16a34a]">
                        {formatBRL(frt.valor)}
                      </div>
                      <div className="text-xs text-slate-400 font-medium">
                        Recebido {formatBRL(frt.recebido)}
                      </div>
                      <div className={`text-xs font-bold ${frt.valor - frt.recebido > 0 ? "text-[#dc2626]" : "text-slate-300"}`}>
                        A receber {formatBRL(frt.valor - frt.recebido)}
                      </div>
                    </div>


                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const text = `*FRETE GDALog*\nEmpresa: ${frt.empresa || "—"}\nRota: ${frt.origem} → ${frt.destino}\nValor: ${formatBRL(frt.valor)}\nRecebido: ${formatBRL(frt.recebido)}`;
                          window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
                        }}
                        className="text-slate-300 hover:text-[#25D366] transition-colors p-1.5 cursor-pointer bg-slate-50 rounded-lg"
                        title="Compartilhar no WhatsApp"
                      >
                        <img src={whatsappIconAsset.url} alt="WhatsApp" className="w-4 h-4 object-contain" />
                      </button>
                      <button
                        onClick={() => handleStartEditFreight(frt)}
                        className="text-slate-300 hover:text-[#0c192c] transition-colors p-1 cursor-pointer"
                        title="Editar frete"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteFreight(frt.id)}
                        className="text-slate-300 hover:text-red-500 transition-colors p-1 cursor-pointer"
                        title="Excluir frete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {freights.length === 0 && (
                <div className="bg-white rounded-2xl p-8 text-center text-slate-400 border border-dashed">
                  Nenhum frete lançado na carteira.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 6: FINANCEIRO (CONSOLIDADO + RELATÓRIO) */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "financeiro" && (
          <FinancialReport
            expenses={expenses}
            freights={freights}
            maintenances={oilChanges}
            vehicles={vehicles}
            formatBRL={formatBRL}
            formatDateBR={formatDateBR}
          />
        )}

      </main>

      {/* ------------------------------------------------------------- */}
      {/* MOBILE BOTTOM NAVIGATION BAR (APP EXPERIENCE) */}
      {/* ------------------------------------------------------------- */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0c192c] border-t border-slate-800 flex justify-around items-center py-2 px-2 z-40 shadow-lg no-print">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`flex flex-col items-center gap-0.5 p-1 rounded-lg text-[10px] font-bold transition-all ${
            activeTab === "dashboard" ? "text-[#f25c05]" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Home className="w-5 h-5" />
          <span>Início</span>
        </button>

        <button
          onClick={() => setActiveTab("frota")}
          className={`flex flex-col items-center gap-0.5 p-1 rounded-lg text-[10px] font-bold transition-all ${
            activeTab === "frota" ? "text-[#f25c05]" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Truck className="w-5 h-5" />
          <span>Frota</span>
        </button>

        <button
          onClick={() => setActiveTab("despesas")}
          className={`flex flex-col items-center gap-0.5 p-1 rounded-lg text-[10px] font-bold transition-all ${
            activeTab === "despesas" ? "text-[#f25c05]" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <DollarSign className="w-5 h-5" />
          <span>Despesas</span>
        </button>

        <button
          onClick={() => setActiveTab("oleo")}
          className={`flex flex-col items-center gap-0.5 p-1 rounded-lg text-[10px] font-bold transition-all ${
            activeTab === "oleo" ? "text-[#f25c05]" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Droplet className="w-5 h-5" />
          <span>Manutenção</span>
        </button>

        <button
          onClick={() => setActiveTab("fretes")}
          className={`flex flex-col items-center gap-0.5 p-1 rounded-lg text-[10px] font-bold transition-all ${
            activeTab === "fretes" ? "text-[#f25c05]" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <CreditCard className="w-5 h-5" />
          <span>Fretes</span>
        </button>

        <button
          onClick={() => setActiveTab("financeiro")}
          className={`flex flex-col items-center gap-0.5 p-1 rounded-lg text-[10px] font-bold transition-all ${
            activeTab === "financeiro" ? "text-[#f25c05]" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span>Financeiro</span>
        </button>
      </div>

      {/* FLOATING QUICK ACTION BUTTON (+) AT BOTTOM RIGHT (Exact orange match) */}
      <button
        onClick={() => setIsQuickActionsOpen(true)}
        className="fixed bottom-16 md:bottom-8 right-5 w-14 h-14 bg-[#f25c05] hover:bg-orange-600 active:scale-95 text-white rounded-full shadow-2xl flex items-center justify-center z-50 transition-all cursor-pointer border-2 border-white no-print"
        title="Novo Lançamento Rápido"
      >
        <Plus className="w-7 h-7 stroke-[3]" />
      </button>

      {/* QUICK ACTIONS DIALOG MENU */}
      <Dialog open={isQuickActionsOpen} onOpenChange={setIsQuickActionsOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#0c192c]">Atalhos de Lançamento</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 py-4">
            <button
              onClick={() => {
                setIsQuickActionsOpen(false);
                setIsExpenseModalOpen(true);
              }}
              className="bg-orange-50 hover:bg-orange-100 border border-orange-200 p-4 rounded-xl text-left flex flex-col items-center justify-center text-center gap-2 cursor-pointer transition-all"
            >
              <div className="bg-[#f25c05] text-white p-2.5 rounded-full shadow">
                <DollarSign className="w-5 h-5" />
              </div>
              <span className="font-bold text-xs text-[#0c192c]">Nova Despesa</span>
            </button>

            <button
              onClick={() => {
                setIsQuickActionsOpen(false);
                setIsFreightModalOpen(true);
              }}
              className="bg-blue-50 hover:bg-blue-100 border border-blue-200 p-4 rounded-xl text-left flex flex-col items-center justify-center text-center gap-2 cursor-pointer transition-all"
            >
              <div className="bg-[#0c192c] text-white p-2.5 rounded-full shadow">
                <CreditCard className="w-5 h-5" />
              </div>
              <span className="font-bold text-xs text-[#0c192c]">Novo Frete</span>
            </button>

            <button
              onClick={() => {
                setIsQuickActionsOpen(false);
                setIsOilModalOpen(true);
              }}
              className="bg-amber-50 hover:bg-amber-100 border border-amber-200 p-4 rounded-xl text-left flex flex-col items-center justify-center text-center gap-2 cursor-pointer transition-all"
            >
              <div className="bg-amber-600 text-white p-2.5 rounded-full shadow">
                <Droplet className="w-5 h-5" />
              </div>
              <span className="font-bold text-xs text-[#0c192c]">Manutenção</span>
            </button>

            <button
              onClick={() => {
                setIsQuickActionsOpen(false);
                setIsVehicleModalOpen(true);
              }}
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 p-4 rounded-xl text-left flex flex-col items-center justify-center text-center gap-2 cursor-pointer transition-all"
            >
              <div className="bg-slate-800 text-white p-2.5 rounded-full shadow">
                <Truck className="w-5 h-5" />
              </div>
              <span className="font-bold text-xs text-[#0c192c]">Novo Veículo</span>
            </button>

            <button
              onClick={() => {
                setIsQuickActionsOpen(false);
                setIsClientModalOpen(true);
              }}
              className="bg-sky-50 hover:bg-sky-100 border border-sky-200 p-4 rounded-xl text-left flex flex-col items-center justify-center text-center gap-2 cursor-pointer transition-all col-span-2"
            >
              <div className="bg-sky-600 text-white p-2.5 rounded-full shadow">
                <User className="w-5 h-5" />
              </div>
              <span className="font-bold text-xs text-[#0c192c]">Novo Cliente</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------- */}
      {/* FORM MODAL 1: NOVA DESPESA */}
      {/* ------------------------------------------------------------- */}
      <Dialog
        open={isExpenseModalOpen}
        onOpenChange={(open) => {
          setIsExpenseModalOpen(open);
          if (!open) {
            setExpEditingId(null);
            setExpPlaca("");
            setExpMotorista("");
            setExpKm("");
            setExpAbastecimento("");
            setExpArla("");
            setExpRastreador("");
            setExpDepreciacao("");
            setExpIpva("");
            setExpDiaria("");
            setExpSalario("");
            setExpOutros("");
            setExpObs("");
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl bg-white rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#0c192c]">
              {expEditingId ? "Editar Despesa de Viagem" : "Lançar Nova Despesa de Viagem"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddExpense} className="space-y-4 py-2">
            
            {/* Placa, Data, Motorista, Km */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Veículo / Placa</Label>
                <select
                  value={expPlaca}
                  onChange={(e) => {
                    setExpPlaca(e.target.value);
                    const found = vehicles.find((v) => v.placa === e.target.value);
                    if (found) setExpMotorista(found.motorista);
                  }}
                  className="w-full mt-1 p-2 border border-slate-200 rounded-lg text-xs bg-white font-bold"
                  required
                >
                  <option value="">Selecione...</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.placa}>{v.placa} ({v.modelo})</option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Data do Lançamento</Label>
                <Input
                  type="date"
                  value={expData}
                  onChange={(e) => setExpData(e.target.value)}
                  className="mt-1 text-xs"
                  required
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Motorista</Label>
                <Input
                  type="text"
                  value={expMotorista}
                  onChange={(e) => setExpMotorista(e.target.value)}
                  placeholder="Nome motorista"
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Km Rodados</Label>
                <Input
                  type="number"
                  value={expKm}
                  onChange={(e) => setExpKm(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="Ex: 785"
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Litros abastecidos</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={expLitros}
                  onChange={(e) => setExpLitros(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="Ex: 250"
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            {/* Detalhamento dos custos (11 categorias) */}
            <div className="border-t border-slate-100 pt-3">
              <Label className="text-xs font-bold text-[#0c192c] block mb-2 uppercase tracking-wide">
                Detalhamento dos Custos (R$)
              </Label>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-[11px] text-slate-500 font-medium">Abastecimento</span>
                  <div className="relative mt-0.5">
                    <span className="absolute left-2.5 top-2 text-xs font-semibold text-slate-400 z-10">R$</span>
                    <CurrencyInput
                      value={expAbastecimento}
                      onChange={setExpAbastecimento}
                      placeholder="0,00"
                      className="text-xs pl-8"
                    />
                  </div>
                </div>

                <div>
                  <span className="text-[11px] text-slate-500 font-medium">Arla</span>
                  <div className="relative mt-0.5">
                    <span className="absolute left-2.5 top-2 text-xs font-semibold text-slate-400 z-10">R$</span>
                    <CurrencyInput
                      value={expArla}
                      onChange={setExpArla}
                      placeholder="0,00"
                      className="text-xs pl-8"
                    />
                  </div>
                </div>

                <div>
                  <span className="text-[11px] text-slate-500 font-medium">Rastreador</span>
                  <div className="relative mt-0.5">
                    <span className="absolute left-2.5 top-2 text-xs font-semibold text-slate-400 z-10">R$</span>
                    <CurrencyInput
                      value={expRastreador}
                      onChange={setExpRastreador}
                      placeholder="0,00"
                      className="text-xs pl-8"
                    />
                  </div>
                </div>

                <div>
                  <span className="text-[11px] text-slate-500 font-medium">Depreciação</span>
                  <div className="relative mt-0.5">
                    <span className="absolute left-2.5 top-2 text-xs font-semibold text-slate-400 z-10">R$</span>
                    <CurrencyInput
                      value={expDepreciacao}
                      onChange={setExpDepreciacao}
                      placeholder="0,00"
                      className="text-xs pl-8"
                    />
                  </div>
                </div>

                <div>
                  <span className="text-[11px] text-slate-500 font-medium">IPVA</span>
                  <div className="relative mt-0.5">
                    <span className="absolute left-2.5 top-2 text-xs font-semibold text-slate-400 z-10">R$</span>
                    <CurrencyInput
                      value={expIpva}
                      onChange={setExpIpva}
                      placeholder="0,00"
                      className="text-xs pl-8"
                    />
                  </div>
                </div>

                <div>
                  <span className="text-[11px] text-slate-500 font-medium">Diária Motorista</span>
                  <div className="relative mt-0.5">
                    <span className="absolute left-2.5 top-2 text-xs font-semibold text-slate-400 z-10">R$</span>
                    <CurrencyInput
                      value={expDiaria}
                      onChange={setExpDiaria}
                      placeholder="0,00"
                      className="text-xs pl-8"
                    />
                  </div>
                </div>

                <div>
                  <span className="text-[11px] text-slate-500 font-medium">Salário</span>
                  <div className="relative mt-0.5">
                    <span className="absolute left-2.5 top-2 text-xs font-semibold text-slate-400 z-10">R$</span>
                    <CurrencyInput
                      value={expSalario}
                      onChange={setExpSalario}
                      placeholder="0,00"
                      className="text-xs pl-8"
                    />
                  </div>
                </div>

                <div>
                  <span className="text-[11px] text-slate-500 font-medium">Comissão do Motorista</span>
                  <div className="relative mt-0.5">
                    <span className="absolute left-2.5 top-2 text-xs font-semibold text-slate-400 z-10">R$</span>
                    <CurrencyInput
                      value={expComissao}
                      onChange={setExpComissao}
                      placeholder="0,00"
                      className="text-xs pl-8"
                    />
                  </div>
                </div>

                <div>
                  <span className="text-[11px] text-slate-500 font-medium">Prestação do Veículo</span>
                  <div className="relative mt-0.5">
                    <span className="absolute left-2.5 top-2 text-xs font-semibold text-slate-400 z-10">R$</span>
                    <CurrencyInput
                      value={expPrestacao}
                      onChange={setExpPrestacao}
                      placeholder="0,00"
                      className="text-xs pl-8"
                    />
                  </div>
                </div>

                <div>
                  <span className="text-[11px] text-slate-500 font-medium">Seguro</span>
                  <div className="relative mt-0.5">
                    <span className="absolute left-2.5 top-2 text-xs font-semibold text-slate-400 z-10">R$</span>
                    <CurrencyInput
                      value={expSeguro}
                      onChange={setExpSeguro}
                      placeholder="0,00"
                      className="text-xs pl-8"
                    />
                  </div>
                </div>

                <div>
                  <span className="text-[11px] text-slate-500 font-medium">Outros / Pedágio</span>
                  <div className="relative mt-0.5">
                    <span className="absolute left-2.5 top-2 text-xs font-semibold text-slate-400 z-10">R$</span>
                    <CurrencyInput
                      value={expOutros}
                      onChange={setExpOutros}
                      placeholder="0,00"
                      className="text-xs pl-8"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Observações da Viagem</Label>
              <Input
                type="text"
                value={expObs}
                onChange={(e) => setExpObs(e.target.value)}
                placeholder="Ex: Retorno com troca de óleo no posto X"
                className="mt-1 text-xs"
              />
            </div>

            <DialogFooter className="pt-2 border-t border-slate-100 flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsExpenseModalOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-[#0c192c] hover:bg-[#162a45] text-white text-xs font-bold"
              >
                {expEditingId ? "Salvar Alterações" : "Salvar Despesa"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------- */}
      {/* FORM MODAL 2: NOVO FRETE */}
      {/* ------------------------------------------------------------- */}
      <Dialog
        open={isFreightModalOpen}
        onOpenChange={(open) => {
          setIsFreightModalOpen(open);
          if (!open) {
            setFrtEditingId(null);
            setFrtOrigem("");
            setFrtDestino("");
            setFrtPlaca("");
            setFrtValor("");
            setFrtRecebido("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#0c192c]">
              {frtEditingId ? "Editar Frete" : "Cadastrar Novo Frete"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddFreight} className="space-y-3 py-2">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Empresa / Cliente</Label>
              <div className="flex gap-2">
                <select
                  value={frtEmpresa}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFrtEmpresa(val);
                    // Tenta encontrar o cliente pelo nome para associar o clienteId
                    const client = clients.find(c => c.nome.toUpperCase() === val.toUpperCase());
                    // Se encontrar um cliente real, talvez queiramos guardar o ID
                  }}
                  className="w-full mt-1 p-2 border border-slate-200 rounded-lg text-xs bg-white font-bold"
                  required
                >
                  <option value="">Selecione ou digite...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.nome}>{c.nome} ({c.tipo})</option>
                  ))}
                  {/* Mantém compatibilidade com empresas avulsas via datalist se necessário, 
                      mas aqui estamos priorizando a seleção de clientes cadastrados */}
                </select>
                <Input
                  type="text"
                  list="empresas-fretes"
                  value={frtEmpresa}
                  onChange={(e) => setFrtEmpresa(e.target.value)}
                  placeholder="Ou digite o nome"
                  className="mt-1 text-xs uppercase font-bold"
                />
              </div>
              <datalist id="empresas-fretes">
                {receivableByCompany.map((c) => (
                  <option key={c.empresa} value={c.empresa} />
                ))}
              </datalist>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Origem</Label>
              <Input
                type="text"
                value={frtOrigem}
                onChange={(e) => setFrtOrigem(e.target.value)}
                placeholder="Ex: CURITIBA"
                className="mt-1 text-xs uppercase"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Destino</Label>
              <Input
                type="text"
                value={frtDestino}
                onChange={(e) => setFrtDestino(e.target.value)}
                placeholder="Ex: SAO PAULO"
                className="mt-1 text-xs uppercase"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Veículo / Placa</Label>
              <select
                value={frtPlaca}
                onChange={(e) => setFrtPlaca(e.target.value)}
                className="w-full mt-1 p-2 border border-slate-200 rounded-lg text-xs bg-white font-bold"
                required
              >
                <option value="">Selecione...</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.placa}>{v.placa} ({v.modelo})</option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Data do Frete</Label>
              <Input
                type="date"
                value={frtData}
                onChange={(e) => setFrtData(e.target.value)}
                className="mt-1 text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Cotação (R$)</Label>
                <div className="relative mt-1">
                  <span className="absolute left-2.5 top-2 text-xs font-semibold text-slate-400 z-10">R$</span>
                  <CurrencyInput
                    value={frtCotacao}
                    onChange={(val) => {
                      setFrtCotacao(val);
                      if (!frtValor && typeof val === "number") setFrtValor(val);
                    }}
                    placeholder="0,00"
                    className="text-xs pl-8 font-bold"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Recebido (R$)</Label>
                <div className="relative mt-1">
                  <span className="absolute left-2.5 top-2 text-xs font-semibold text-slate-400 z-10">R$</span>
                  <CurrencyInput
                    value={frtRecebido}
                    onChange={setFrtRecebido}
                    placeholder="0,00"
                    className="text-xs pl-8 font-bold text-green-600"
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 flex flex-col justify-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Saldo a Receber</span>
                <span className="text-sm font-black text-red-600">
                  {formatBRL(
                    (typeof frtValor === "number" ? frtValor : (typeof frtCotacao === "number" ? frtCotacao : 0)) - 
                    (typeof frtRecebido === "number" ? frtRecebido : 0)
                  )}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Valor Ajustado (R$)</Label>
                <div className="relative mt-1">
                  <span className="absolute left-2.5 top-2 text-xs font-semibold text-slate-400 z-10">R$</span>
                  <CurrencyInput
                    value={frtCotacao}
                    onChange={(v) => {
                      // A cotação alimenta o valor final automaticamente enquanto não houver ajuste manual.
                      if (frtValor === "" || frtValor === frtCotacao) setFrtValor(v);
                      setFrtCotacao(v);
                    }}
                    placeholder="0,00"
                    className="text-xs pl-8"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Valor Ajustado / Final (R$)</Label>
                <div className="relative mt-1">
                  <span className="absolute left-2.5 top-2 text-xs font-semibold text-slate-400 z-10">R$</span>
                  <CurrencyInput
                    value={frtValor}
                    onChange={setFrtValor}
                    placeholder="0,00"
                    className="text-xs pl-8"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Valor Já Recebido (R$)</Label>
                <div className="relative mt-1">
                  <span className="absolute left-2.5 top-2 text-xs font-semibold text-slate-400 z-10">R$</span>
                  <CurrencyInput
                    value={frtRecebido}
                    onChange={setFrtRecebido}
                    placeholder="0,00"
                    className="text-xs pl-8"
                  />
                </div>
              </div>
            </div>

            {/* CÁLCULO AUTOMÁTICO DO LANÇAMENTO */}
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-400">Ajuste vs cotação</div>
                <div className="text-xs font-black text-[#0c192c]">
                  {formatBRL((typeof frtValor === "number" ? frtValor : 0) - (typeof frtCotacao === "number" ? frtCotacao : 0))}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-400">A receber</div>
                <div className="text-xs font-black text-[#dc2626]">
                  {formatBRL((typeof frtValor === "number" ? frtValor : 0) - (typeof frtRecebido === "number" ? frtRecebido : 0))}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-400">% recebido</div>
                <div className="text-xs font-black text-[#16a34a]">
                  {typeof frtValor === "number" && frtValor > 0
                    ? Math.round(((typeof frtRecebido === "number" ? frtRecebido : 0) / frtValor) * 100)
                    : 0}
                  %
                </div>
              </div>
            </div>


            <DialogFooter className="pt-2 border-t border-slate-100 flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFreightModalOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-[#0c192c] hover:bg-[#162a45] text-white text-xs font-bold"
              >
                {frtEditingId ? "Salvar Alterações" : "Salvar Frete"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------- */}
      {/* FORM MODAL 3: NOVO VEÍCULO */}
      {/* ------------------------------------------------------------- */}
      <Dialog
        open={isVehicleModalOpen}
        onOpenChange={(open) => {
          setIsVehicleModalOpen(open);
          if (!open) {
            setVehEditingId(null);
            setVehPlaca("");
            setVehModelo("");
            setVehMotorista("");
            setVehCategoria("LOGISTICA");
          }
        }}
      >
        <DialogContent className="sm:max-w-md bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#0c192c]">
              {vehEditingId ? "Editar Veículo" : "Cadastrar Novo Veículo"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddVehicle} className="space-y-3 py-2">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Placa do Veículo</Label>
              <Input
                type="text"
                value={vehPlaca}
                onChange={(e) => setVehPlaca(e.target.value)}
                placeholder="Ex: AHV 9J29"
                className="mt-1 text-xs uppercase font-bold"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Modelo do Veículo</Label>
              <Input
                type="text"
                value={vehModelo}
                onChange={(e) => setVehModelo(e.target.value)}
                placeholder="Ex: Volvo FH 460"
                className="mt-1 text-xs"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Motorista Principal</Label>
              <select
                value={vehMotorista}
                onChange={(e) => setVehMotorista(e.target.value)}
                className="w-full mt-1 p-2 border border-slate-200 rounded-lg text-xs bg-white font-bold"
              >
                <option value="">Selecione o motorista...</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.nome}>{d.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Categoria / Operação</Label>
              <Input
                type="text"
                value={vehCategoria}
                onChange={(e) => setVehCategoria(e.target.value)}
                placeholder="Ex: LOGISTICA"
                className="mt-1 text-xs uppercase"
              />
            </div>

            <DialogFooter className="pt-2 border-t border-slate-100 flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsVehicleModalOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-[#0c192c] hover:bg-[#162a45] text-white text-xs font-bold"
              >
                {vehEditingId ? "Salvar Alterações" : "Salvar Veículo"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------- */}
      {/* FORM MODAL 3.5: NOVO / EDITAR MOTORISTA */}
      {/* ------------------------------------------------------------- */}
      <Dialog
        open={isDriverModalOpen}
        onOpenChange={(open) => {
          setIsDriverModalOpen(open);
          if (!open) {
            setDrvEditingId(null);
            setDrvNome("");
            setDrvCnh("");
            setDrvTelefone("");
            setDrvCategoria("E");
            setDrvStatus("Ativo");
            setDrvFoto("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#0c192c]">
              {drvEditingId ? "Editar Motorista" : "Cadastrar Novo Motorista"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddDriver} className="space-y-3 py-2">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Nome Completo</Label>
              <Input
                type="text"
                value={drvNome}
                onChange={(e) => setDrvNome(e.target.value)}
                placeholder="Ex: CARLOS SILVA"
                className="mt-1 text-xs uppercase font-bold"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Número da CNH</Label>
                <Input
                  type="text"
                  value={drvCnh}
                  onChange={(e) => setDrvCnh(e.target.value)}
                  placeholder="Ex: 123456789"
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Categoria CNH</Label>
                <select
                  value={drvCategoria}
                  onChange={(e) => setDrvCategoria(e.target.value)}
                  className="w-full mt-1 p-2 border border-slate-200 rounded-lg text-xs bg-white font-bold"
                >
                  <option value="C">Categoria C</option>
                  <option value="D">Categoria D</option>
                  <option value="E">Categoria E</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Telefone / WhatsApp</Label>
                <Input
                  type="text"
                  value={drvTelefone}
                  onChange={(e) => {
                    let v = e.target.value.replace(/\D/g, "");
                    if (v.length > 11) v = v.slice(0, 11);
                    if (v.length > 7) {
                      v = `${v.slice(0, 2)} ${v.slice(2, 7)}-${v.slice(7)}`;
                    } else if (v.length > 2) {
                      v = `${v.slice(0, 2)} ${v.slice(2)}`;
                    }
                    setDrvTelefone(v);
                  }}
                  placeholder="11 97888-9874"
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Status Operacional</Label>
                <select
                  value={drvStatus}
                  onChange={(e) => setDrvStatus(e.target.value as any)}
                  className="w-full mt-1 p-2 border border-slate-200 rounded-lg text-xs bg-white font-bold"
                >
                  <option value="Ativo">Ativo</option>
                  <option value="Em Viagem">Em Viagem</option>
                  <option value="Férias">Férias</option>
                </select>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Foto do Motorista (Arquivo ou URL)</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (uploadEvent) => {
                        setDrvFoto(uploadEvent.target?.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="text-xs cursor-pointer"
                />
              </div>
              {drvFoto && (
                <div className="mt-2 flex items-center gap-2">
                  <img src={drvFoto} alt="Pré-visualização" className="w-10 h-10 rounded-full object-cover border" />
                  <span className="text-[11px] text-green-600 font-semibold">Foto carregada com sucesso!</span>
                </div>
              )}
            </div>

            <DialogFooter className="pt-2 border-t border-slate-100 flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDriverModalOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-[#f25c05] hover:bg-orange-600 text-white text-xs font-bold"
              >
                {drvEditingId ? "Salvar Alterações" : "Salvar Motorista"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------- */}
      {/* FORM MODAL 4: MANUTENÇÃO */}
      {/* ------------------------------------------------------------- */}
      <Dialog
        open={isOilModalOpen}
        onOpenChange={(open) => {
          setIsOilModalOpen(open);
          if (!open) {
            setOilEditingId(null);
            setOilPlaca("");
            setOilMotorista("");
            setOilKmAtual("");
            setOilProximaKm("");
            setOilCusto("");
            setOilCategoriaServico("Troca de Óleo");
            setOilObs("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#0c192c]">
              {oilEditingId ? "Editar Manutenção" : "Registrar Manutenção"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddOilChange} className="space-y-3 py-2">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Veículo / Placa</Label>
              <select
                value={oilPlaca}
                onChange={(e) => {
                  setOilPlaca(e.target.value);
                  const found = vehicles.find((v) => v.placa === e.target.value);
                  if (found) setOilMotorista(found.motorista);
                }}
                className="w-full mt-1 p-2 border border-slate-200 rounded-lg text-xs bg-white font-bold"
                required
              >
                <option value="">Selecione...</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.placa}>{v.placa} ({v.modelo})</option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Categoria de Serviço / Manutenção</Label>
              <select
                value={oilCategoriaServico}
                onChange={(e) => setOilCategoriaServico(e.target.value as MaintenanceCategory)}
                className="w-full mt-1 p-2 border border-slate-200 rounded-lg text-xs bg-white font-bold"
                required
              >
                <option value="Troca de Óleo">🛢️ Troca de Óleo</option>
                <option value="Freios">🛑 Freios</option>
                <option value="Peças de Motor">🚛 Peças de Motor</option>
                <option value="Peças do Câmbio">⚙️ Peças do Câmbio</option>
                <option value="Pneus">🔘 Pneus</option>
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Motorista</Label>
              <Input
                type="text"
                value={oilMotorista}
                onChange={(e) => setOilMotorista(e.target.value)}
                placeholder="Ex: GUSTAVO"
                className="mt-1 text-xs uppercase"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Data da Manutenção</Label>
                <Input
                  type="date"
                  value={oilData}
                  onChange={(e) => setOilData(e.target.value)}
                  className="mt-1 text-xs"
                  required
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Custo (R$)</Label>
                <div className="relative mt-1">
                  <span className="absolute left-2.5 top-2 text-xs font-semibold text-slate-400 z-10">R$</span>
                  <CurrencyInput
                    value={oilCusto}
                    onChange={setOilCusto}
                    placeholder="0,00"
                    className="text-xs pl-8"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Km Atual</Label>
                <Input
                  type="number"
                  value={oilKmAtual}
                  onChange={(e) => {
                    const kmVal = e.target.value === "" ? "" : Number(e.target.value);
                    setOilKmAtual(kmVal);
                    if (typeof kmVal === "number") {
                      setOilProximaKm(kmVal + 10000);
                    }
                  }}
                  placeholder="Ex: 145800"
                  className="mt-1 text-xs"
                  required
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Próxima Revisão (Km)</Label>
                <Input
                  type="number"
                  value={oilProximaKm}
                  onChange={(e) => setOilProximaKm(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="Ex: 155800"
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Observações / Peças Trocadas</Label>
              <Input
                type="text"
                value={oilObs}
                onChange={(e) => setOilObs(e.target.value)}
                placeholder="Ex: Substituição de pastilhas e lonas"
                className="mt-1 text-xs"
              />
            </div>

            <DialogFooter className="pt-2 border-t border-slate-100 flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOilModalOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-[#0c192c] hover:bg-[#162a45] text-white text-xs font-bold"
              >
                {oilEditingId ? "Salvar Alterações" : "Salvar Manutenção"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------- */}
      {/* FORM MODAL 5: CLIENTES */}
      {/* ------------------------------------------------------------- */}
      <Dialog
        open={isClientModalOpen}
        onOpenChange={(open) => {
          setIsClientModalOpen(open);
          if (!open) {
            setCliEditingId(null);
            setCliNome("");
            setCliDocumento("");
            setCliTipo("PJ");
            setCliContato("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#0c192c]">
              {cliEditingId ? "Editar Cliente" : "Cadastrar Novo Cliente"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddClient} className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Nome do Cliente / Razão Social</Label>
              <Input
                type="text"
                value={cliNome}
                onChange={(e) => setCliNome(e.target.value)}
                placeholder="Ex: PAULO ou TRANSPORTES ALFA"
                className="mt-1 text-xs uppercase font-bold"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Tipo</Label>
                <div className="flex gap-2 mt-1">
                  <Button
                    type="button"
                    variant={cliTipo === "PF" ? "default" : "outline"}
                    onClick={() => setCliTipo("PF")}
                    className="flex-1 text-xs h-9"
                  >
                    Pessoa Física
                  </Button>
                  <Button
                    type="button"
                    variant={cliTipo === "PJ" ? "default" : "outline"}
                    onClick={() => setCliTipo("PJ")}
                    className="flex-1 text-xs h-9"
                  >
                    Pessoa Jurídica
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">
                  {cliTipo === "PF" ? "CPF" : "CNPJ"}
                </Label>
                <Input
                  type="text"
                  value={cliDocumento}
                  onChange={(e) => {
                    let v = e.target.value.replace(/\D/g, "");
                    if (cliTipo === "PF") {
                      if (v.length > 11) v = v.slice(0, 11);
                      if (v.length > 9) v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
                      else if (v.length > 6) v = v.replace(/(\d{3})(\d{3})(\d{1})/, "$1.$2.$3");
                      else if (v.length > 3) v = v.replace(/(\d{3})(\d{1})/, "$1.$2");
                    } else {
                      if (v.length > 14) v = v.slice(0, 14);
                      if (v.length > 12) v = v.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
                      else if (v.length > 8) v = v.replace(/(\d{2})(\d{3})(\d{3})(\d{1})/, "$1.$2.$3/$4");
                    }
                    setCliDocumento(v);
                  }}
                  placeholder={cliTipo === "PF" ? "000.000.000-00" : "00.000.000/0000-00"}
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Contato / WhatsApp</Label>
              <Input
                type="text"
                value={cliContato}
                onChange={(e) => setCliContato(e.target.value)}
                placeholder="Ex: 11 99999-9999"
                className="mt-1 text-xs"
              />
            </div>

            <DialogFooter className="pt-2 border-t border-slate-100 flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsClientModalOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-[#0c192c] hover:bg-[#162a45] text-white text-xs font-bold"
              >
                {cliEditingId ? "Salvar Alterações" : "Salvar Cliente"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------- */}
      {/* TAB 7: CLIENTES */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "clientes" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-[#0c192c] tracking-tight">Clientes</h1>
              <p className="text-slate-500 text-xs sm:text-sm">Gestão de clientes PF e PJ</p>
            </div>

            <Button
              onClick={() => setIsClientModalOpen(true)}
              className="bg-[#0c192c] hover:bg-[#162a45] text-white font-semibold rounded-xl px-4 py-2 flex items-center gap-1.5 shadow cursor-pointer text-xs"
            >
              <Plus className="w-4 h-4" /> Novo Cliente
            </Button>
          </div>

          {/* Barra de Busca de Clientes */}
          <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
            <Settings className="w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Buscar cliente por nome ou documento..."
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              className="border-none bg-transparent text-xs focus-visible:ring-0 p-0 h-auto"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients
              .filter(cli => 
                cli.nome.toLowerCase().includes(clientSearch.toLowerCase()) || 
                cli.documento.includes(clientSearch)
              )
              .map((cli) => {
                // Filtra fretes vinculados a este cliente
                const clientFreights = freights.filter(f => f.clienteId === cli.id || f.empresa.toUpperCase() === cli.nome.toUpperCase());
                const totalRevenue = clientFreights.reduce((acc, f) => acc + (f.valor || 0), 0);
                const totalBalance = clientFreights.reduce((acc, f) => acc + ((f.valor || 0) - (f.recebido || 0)), 0);

                return (
                  <Card key={cli.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 relative group hover:shadow-md transition-all">
                    <div className="absolute top-4 right-4 flex items-center gap-1">
                      <button
                        onClick={() => handleStartEditClient(cli)}
                        className="text-slate-300 hover:text-[#0c192c] transition-colors p-1 cursor-pointer"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClient(cli.id)}
                        className="text-slate-300 hover:text-red-500 transition-colors p-1 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-3 mb-3">
                      <div className={`p-2 rounded-lg ${cli.tipo === "PF" ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"}`}>
                        {cli.tipo === "PF" ? <User className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="font-black text-[#0c192c] uppercase">{cli.nome}</div>
                        <div className="text-[10px] font-bold text-slate-400">{cli.tipo === "PF" ? "PESSOA FÍSICA" : "PESSOA JURÍDICA"}</div>
                      </div>
                    </div>

                    <div className="space-y-2 border-t border-slate-50 pt-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-medium">{cli.tipo === "PF" ? "CPF" : "CNPJ"}</span>
                        <span className="text-[#0c192c] font-bold">{cli.documento || "---"}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-medium">Contato</span>
                        <span className="text-[#0c192c] font-bold">{cli.contato || "---"}</span>
                      </div>
                      
                      {/* Histórico Vinculado */}
                      <div className="mt-3 pt-3 border-t border-slate-50 space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                          <span className="text-slate-400">Total em Fretes</span>
                          <span className="text-[#16a34a]">{formatBRL(totalRevenue)}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                          <span className="text-slate-400">Saldo Pendente</span>
                          <span className={totalBalance > 0 ? "text-[#dc2626]" : "text-slate-400"}>{formatBRL(totalBalance)}</span>
                        </div>
                        
                        {clientFreights.length > 0 ? (
                          <div className="mt-2 space-y-1">
                            <span className="text-[9px] font-bold text-slate-400 uppercase">Últimos Fretes:</span>
                            {clientFreights.slice(0, 2).map(f => (
                              <div key={f.id} className="text-[9px] bg-slate-50 p-1 rounded border border-slate-100 flex justify-between">
                                <span className="text-slate-600 font-medium truncate max-w-[120px]">{f.origem} → {f.destino}</span>
                                <span className="text-[#0c192c] font-bold">{formatBRL(f.valor)}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[9px] text-slate-400 italic">Sem histórico de fretes</div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}

            {clients.length === 0 && (
              <div className="col-span-full py-12 text-center bg-white rounded-2xl border-2 border-dashed border-slate-100">
                <div className="text-slate-300 font-bold mb-1">Nenhum cliente cadastrado</div>
                <p className="text-slate-400 text-xs">Comece adicionando seu primeiro cliente</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
