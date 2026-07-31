import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
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
  BarChart3
} from "lucide-react";
import { Toaster, toast } from "sonner";
import logoAsset from "@/assets/logo.png.asset.json";
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
          "Acompanhe frota, despesas, fretes e manutenção da sua operação rodoviária.",
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
  outros: number;
}

interface Expense {
  id: string;
  placa: string;
  data: string;
  motorista: string;
  km: number;
  detalhes: ExpenseDetails;
  total: number;
  observacao: string;
}

interface Freight {
  id: string;
  origem: string;
  destino: string;
  placa: string;
  data: string;
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
    { id: "d1", nome: "MARCOS", cnh: "12345678900", telefone: "11 98765-4321", categoria: "E", status: "Em Viagem", foto: "" },
  ] as Driver[],
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
      detalhes: {
        abastecimento: 3200,
        arla: 200,
        rastreador: 90,
        depreciacao: 600,
        ipva: 150,
        diaria: 300,
        salario: 1300,
        outros: 120,
      },
      total: 5960,
      observacao: "Frete Campinas x BH",
    },
  ] as Expense[],
  freights: [
    {
      id: "f1",
      origem: "CAMPINAS",
      destino: "BELO HORIZONTE",
      placa: "AHV 9J29",
      data: "2026-07-28",
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

export function TransportManagementSystem() {
  // LOGIN STATE
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [loginEmail, setLoginEmail] = useState<string>("admin@gdalog.com.br");
  const [loginPassword, setLoginPassword] = useState<string>("123456");

  // APP TABS STATE
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "frota" | "despesas" | "oleo" | "fretes" | "financeiro"
  >("dashboard");

  // DATA PERSISTENCE STATE WITH LOCALSTORAGE
  const [drivers, setDrivers] = useState<Driver[]>(() => {
    if (typeof window === "undefined") return INITIAL_DATA.drivers;
    const saved = localStorage.getItem("gdalog_drivers");
    return saved ? JSON.parse(saved) : INITIAL_DATA.drivers;
  });

  const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
    if (typeof window === "undefined") return INITIAL_DATA.vehicles;
    const saved = localStorage.getItem("gdalog_vehicles");
    return saved ? JSON.parse(saved) : INITIAL_DATA.vehicles;
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    if (typeof window === "undefined") return INITIAL_DATA.expenses;
    const saved = localStorage.getItem("gdalog_expenses");
    return saved ? JSON.parse(saved) : INITIAL_DATA.expenses;
  });

  const [freights, setFreights] = useState<Freight[]>(() => {
    if (typeof window === "undefined") return INITIAL_DATA.freights;
    const saved = localStorage.getItem("gdalog_freights");
    return saved ? JSON.parse(saved) : INITIAL_DATA.freights;
  });

  const [oilChanges, setOilChanges] = useState<OilChange[]>(() => {
    if (typeof window === "undefined") return INITIAL_DATA.oilChanges;
    const saved = localStorage.getItem("gdalog_oilChanges");
    return saved ? JSON.parse(saved) : INITIAL_DATA.oilChanges;
  });

  useMemo(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("gdalog_drivers", JSON.stringify(drivers));
    }
  }, [drivers]);

  useMemo(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("gdalog_vehicles", JSON.stringify(vehicles));
    }
  }, [vehicles]);

  useMemo(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("gdalog_expenses", JSON.stringify(expenses));
    }
  }, [expenses]);

  useMemo(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("gdalog_freights", JSON.stringify(freights));
    }
  }, [freights]);

  useMemo(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("gdalog_oilChanges", JSON.stringify(oilChanges));
    }
  }, [oilChanges]);

  // MODAL STATES
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isFreightModalOpen, setIsFreightModalOpen] = useState(false);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [isOilModalOpen, setIsOilModalOpen] = useState(false);
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);

  // DRIVER FORM STATES
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
  const [expAbastecimento, setExpAbastecimento] = useState<number | "">("");
  const [expArla, setExpArla] = useState<number | "">("");
  const [expRastreador, setExpRastreador] = useState<number | "">("");
  const [expDepreciacao, setExpDepreciacao] = useState<number | "">("");
  const [expIpva, setExpIpva] = useState<number | "">("");
  const [expDiaria, setExpDiaria] = useState<number | "">("");
  const [expSalario, setExpSalario] = useState<number | "">("");
  const [expOutros, setExpOutros] = useState<number | "">("");
  const [expObs, setExpObs] = useState("");

  // Freight Form
  const [frtOrigem, setFrtOrigem] = useState("");
  const [frtDestino, setFrtDestino] = useState("");
  const [frtPlaca, setFrtPlaca] = useState("");
  const [frtData, setFrtData] = useState(new Date().toISOString().slice(0, 10));
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

  // ADD EXPENSE HANDLER
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expPlaca) {
      toast.error("Por favor, selecione ou informe a placa do veículo.");
      return;
    }

    const num = (v: number | "") => (typeof v === "number" ? v : 0);

    const calculatedTotal =
      num(expAbastecimento) +
      num(expArla) +
      num(expRastreador) +
      num(expDepreciacao) +
      num(expIpva) +
      num(expDiaria) +
      num(expSalario) +
      num(expOutros);

    const newExp: Expense = {
      id: "exp_" + Date.now(),
      placa: expPlaca.toUpperCase(),
      data: expData,
      motorista: expMotorista || "MOTORISTA",
      km: num(expKm),
      detalhes: {
        abastecimento: num(expAbastecimento),
        arla: num(expArla),
        rastreador: num(expRastreador),
        depreciacao: num(expDepreciacao),
        ipva: num(expIpva),
        diaria: num(expDiaria),
        salario: num(expSalario),
        outros: num(expOutros),
      },
      total: calculatedTotal,
      observacao: expObs,
    };

    setExpenses([newExp, ...expenses]);
    toast.success(`Despesa de R$ ${calculatedTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} adicionada!`);

    // Reset Form
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
    setIsExpenseModalOpen(false);
  };

  // ADD FREIGHT HANDLER
  const handleAddFreight = (e: React.FormEvent) => {
    e.preventDefault();
    if (!frtOrigem || !frtDestino || !frtPlaca) {
      toast.error("Preencha origem, destino e a placa do veículo.");
      return;
    }

    const val = typeof frtValor === "number" ? frtValor : 0;
    const rec = typeof frtRecebido === "number" ? frtRecebido : 0;

    const newFrt: Freight = {
      id: "frt_" + Date.now(),
      origem: frtOrigem.toUpperCase(),
      destino: frtDestino.toUpperCase(),
      placa: frtPlaca.toUpperCase(),
      data: frtData,
      valor: val,
      recebido: rec,
    };

    setFreights([newFrt, ...freights]);
    toast.success(`Frete de R$ ${val.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} cadastrado com sucesso!`);

    setFrtOrigem("");
    setFrtDestino("");
    setFrtPlaca("");
    setFrtValor("");
    setFrtRecebido("");
    setIsFreightModalOpen(false);
  };

  // ADD VEHICLE HANDLER
  const handleAddVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehPlaca || !vehModelo) {
      toast.error("Informe a placa e o modelo do veículo.");
      return;
    }

    const newVeh: Vehicle = {
      id: "veh_" + Date.now(),
      placa: vehPlaca.toUpperCase(),
      modelo: vehModelo,
      motorista: vehMotorista.toUpperCase() || "NÃO ATRIBUÍDO",
      categoria: vehCategoria.toUpperCase() || "LOGISTICA",
    };

    setVehicles([...vehicles, newVeh]);
    toast.success(`Veículo ${newVeh.placa} cadastrado na frota!`);

    setVehPlaca("");
    setVehModelo("");
    setVehMotorista("");
    setIsVehicleModalOpen(false);
  };

  // ADD DRIVER HANDLER
  const handleAddDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!drvNome) {
      toast.error("Informe o nome do motorista.");
      return;
    }

    const newDrv: Driver = {
      id: "drv_" + Date.now(),
      nome: drvNome.toUpperCase(),
      cnh: drvCnh || "Não informada",
      telefone: drvTelefone || "Não informado",
      categoria: drvCategoria || "E",
      status: drvStatus,
      foto: drvFoto || "",
    };

    setDrivers([...drivers, newDrv]);
    toast.success(`Motorista ${newDrv.nome} cadastrado com sucesso!`);

    setDrvNome("");
    setDrvCnh("");
    setDrvTelefone("");
    setDrvCategoria("E");
    setDrvStatus("Ativo");
    setDrvFoto("");
    setIsDriverModalOpen(false);
  };

  // ADD OIL CHANGE HANDLER
  const handleAddOilChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!oilPlaca) {
      toast.error("Informe a placa do veículo.");
      return;
    }

    const km = typeof oilKmAtual === "number" ? oilKmAtual : 0;
    const prox = typeof oilProximaKm === "number" ? oilProximaKm : km + 10000;
    const custo = typeof oilCusto === "number" ? oilCusto : 0;

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

    setOilChanges([newOil, ...oilChanges]);
    toast.success(`Manutenção (${oilCategoriaServico}) para ${newOil.placa} registrada!`);

    setOilPlaca("");
    setOilMotorista("");
    setOilKmAtual("");
    setOilProximaKm("");
    setOilCusto("");
    setOilCategoriaServico("Troca de Óleo");
    setOilObs("");
    setIsOilModalOpen(false);
  };

  // DELETE HANDLERS
  const handleDeleteExpense = (id: string) => {
    setExpenses(expenses.filter((item) => item.id !== id));
    toast.info("Despesa removida.");
  };

  const handleDeleteFreight = (id: string) => {
    setFreights(freights.filter((item) => item.id !== id));
    toast.info("Frete removido.");
  };

  const handleDeleteVehicle = (id: string) => {
    setVehicles(vehicles.filter((item) => item.id !== id));
    toast.info("Veículo removido da frota.");
  };

  const handleDeleteDriver = (id: string) => {
    setDrivers(drivers.filter((item) => item.id !== id));
    toast.info("Motorista removido do sistema.");
  };

  const handleDeleteOilChange = (id: string) => {
    setOilChanges(oilChanges.filter((item) => item.id !== id));
    toast.info("Registro de troca de óleo removido.");
  };

  // LOGIN HANDLER
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginEmail && loginPassword) {
      setIsAuthenticated(true);
      toast.success("Acesso ao sistema liberado!");
    } else {
      toast.error("Preencha e-mail e senha.");
    }
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
              className="w-full bg-[#0b192c] hover:bg-[#162a45] text-white font-semibold py-2.5 rounded-xl transition-all shadow-md mt-2 flex items-center justify-center gap-2 cursor-pointer"
            >
              Clique para entrar com os dados <ArrowRight className="w-4 h-4" />
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
    <div className="min-h-screen bg-[#f4f6f9] text-slate-800 font-sans pb-24 md:pb-12">
      <Toaster position="top-right" />

      {/* TOP NAVBAR (Exact match to screenshots visual identity) */}
      <header className="bg-[#0c192c] text-white sticky top-0 z-30 shadow-md no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-3">
            <div className="bg-white px-3 py-0.5 rounded-lg shadow-sm flex items-center">
              <img src={logoAsset.url} alt="GDALog" className="h-14 w-auto object-contain" />
            </div>
            <span className="font-bold text-sm sm:text-base tracking-tight hidden sm:inline-block border-l border-slate-700 pl-3 text-slate-200">
              Gestão de Transportes
            </span>
          </div>

          {/* Navigation Links Desktop */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
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
          </nav>

          {/* Logout */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={() => {
                setIsAuthenticated(false);
                toast.info("Sessão encerrada.");
              }}
              className="flex items-center gap-1 text-slate-300 hover:text-white px-2 py-1.5 rounded text-xs font-semibold cursor-pointer transition-colors"
              title="Sair do Sistema"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">

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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                    <button
                      onClick={() => handleDeleteVehicle(veh.id)}
                      className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors p-1 cursor-pointer"
                      title="Excluir veículo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

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
                    <button
                      onClick={() => handleDeleteDriver(drv.id)}
                      className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors p-1 cursor-pointer"
                      title="Excluir motorista"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

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
                      <button
                        onClick={() => handleDeleteExpense(exp.id)}
                        className="text-slate-300 hover:text-red-500 transition-colors p-1 cursor-pointer"
                        title="Excluir despesa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
                    {exp.detalhes.outros > 0 && (
                      <span>Outros: <strong className="text-slate-900">{formatBRL(exp.detalhes.outros)}</strong></span>
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
                    <button
                      onClick={() => handleDeleteOilChange(oil.id)}
                      className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors p-1 cursor-pointer"
                      title="Excluir manutenção"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

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

            {/* Freights List */}
            <div className="space-y-3">
              {freights.map((frt) => (
                <div
                  key={frt.id}
                  className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all"
                >
                  <div>
                    <div className="font-extrabold text-base text-[#0c192c] uppercase">
                      {frt.origem} → {frt.destino}
                    </div>
                    <div className="text-xs text-slate-400 font-medium mt-0.5">
                      {frt.placa} · {formatDateBR(frt.data)}
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
                    </div>

                    <button
                      onClick={() => handleDeleteFreight(frt.id)}
                      className="text-slate-300 hover:text-red-500 transition-colors p-1 cursor-pointer"
                      title="Excluir frete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
                setIsDriverModalOpen(true);
              }}
              className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 p-4 rounded-xl text-left flex flex-col items-center justify-center text-center gap-2 cursor-pointer transition-all col-span-2"
            >
              <div className="bg-emerald-600 text-white p-2.5 rounded-full shadow">
                <User className="w-5 h-5" />
              </div>
              <span className="font-bold text-xs text-[#0c192c]">Novo Motorista</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------- */}
      {/* FORM MODAL 1: NOVA DESPESA */}
      {/* ------------------------------------------------------------- */}
      <Dialog open={isExpenseModalOpen} onOpenChange={setIsExpenseModalOpen}>
        <DialogContent className="sm:max-w-2xl bg-white rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#0c192c]">Lançar Nova Despesa de Viagem</DialogTitle>
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
                Salvar Despesa
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------- */}
      {/* FORM MODAL 2: NOVO FRETE */}
      {/* ------------------------------------------------------------- */}
      <Dialog open={isFreightModalOpen} onOpenChange={setIsFreightModalOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#0c192c]">Cadastrar Novo Frete</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddFreight} className="space-y-3 py-2">
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Valor Total Frete (R$)</Label>
                <div className="relative mt-1">
                  <span className="absolute left-2.5 top-2 text-xs font-semibold text-slate-400 z-10">R$</span>
                  <CurrencyInput
                    value={frtValor}
                    onChange={setFrtValor}
                    placeholder="0,00"
                    className="text-xs pl-8"
                    required
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
                Salvar Frete
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------- */}
      {/* FORM MODAL 3: NOVO VEÍCULO */}
      {/* ------------------------------------------------------------- */}
      <Dialog open={isVehicleModalOpen} onOpenChange={setIsVehicleModalOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#0c192c]">Cadastrar Novo Veículo</DialogTitle>
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
                Salvar Veículo
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------- */}
      {/* FORM MODAL 3.5: NOVO MOTORISTA */}
      {/* ------------------------------------------------------------- */}
      <Dialog open={isDriverModalOpen} onOpenChange={setIsDriverModalOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#0c192c]">Cadastrar Novo Motorista</DialogTitle>
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
                Salvar Motorista
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------- */}
      {/* FORM MODAL 4: MANUTENÇÃO */}
      {/* ------------------------------------------------------------- */}
      <Dialog open={isOilModalOpen} onOpenChange={setIsOilModalOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#0c192c]">Registrar Manutenção</DialogTitle>
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
                Salvar Manutenção
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
