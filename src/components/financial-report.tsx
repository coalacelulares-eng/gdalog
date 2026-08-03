import { useMemo, useState } from "react";
import {
  Printer,
  Download,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface FinExpenseDetails {
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

export interface FinExpense {
  id: string;
  placa: string;
  data: string;
  motorista: string;
  km: number;
  litros?: number;
  detalhes: FinExpenseDetails;
  total: number;
  observacao: string;
}

export interface FinFreight {
  id: string;
  origem: string;
  destino: string;
  placa: string;
  data: string;
  valor: number;
  recebido: number;
}

export interface FinMaintenance {
  id: string;
  placa: string;
  data: string;
  custo: number;
  categoriaServico: string;
}

export interface FinVehicle {
  id: string;
  placa: string;
  modelo: string;
  motorista: string;
}

interface FinancialReportProps {
  expenses: FinExpense[];
  freights: FinFreight[];
  maintenances: FinMaintenance[];
  vehicles: FinVehicle[];
  formatBRL: (v: number) => string;
  formatDateBR: (v: string) => string;
}

const COST_LABELS: { key: keyof FinExpenseDetails; label: string }[] = [
  { key: "abastecimento", label: "Diesel / Abastecimento" },
  { key: "arla", label: "Arla" },
  { key: "rastreador", label: "Rastreador" },
  { key: "depreciacao", label: "Depreciação" },
  { key: "ipva", label: "IPVA / Licenciamento" },
  { key: "seguro", label: "Seguro" },
  { key: "prestacao", label: "Prestação de veículos" },
  { key: "comissao", label: "Comissão de motorista" },
  { key: "diaria", label: "Diária" },
  { key: "salario", label: "Salário" },
  { key: "outros", label: "Outros" },
];

export const MAINT_SERVICES = [
  "Troca de Óleo",
  "Freios",
  "Peças de Motor",
  "Peças do Câmbio",
  "Pneus",
] as const;

export function FinancialReport({
  expenses,
  freights,
  maintenances,
  vehicles,
  formatBRL,
  formatDateBR,
}: FinancialReportProps) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [placaFilter, setPlacaFilter] = useState("");

  const inRange = (data: string) => {
    if (dateFrom && data < dateFrom) return false;
    if (dateTo && data > dateTo) return false;
    return true;
  };
  const matchPlaca = (placa: string) =>
    !placaFilter || placa.toUpperCase() === placaFilter.toUpperCase();

  const fExpenses = useMemo(
    () => expenses.filter((e) => inRange(e.data) && matchPlaca(e.placa)),
    [expenses, dateFrom, dateTo, placaFilter],
  );
  const fFreights = useMemo(
    () => freights.filter((f) => inRange(f.data) && matchPlaca(f.placa)),
    [freights, dateFrom, dateTo, placaFilter],
  );
  const fMaint = useMemo(
    () => maintenances.filter((m) => inRange(m.data) && matchPlaca(m.placa)),
    [maintenances, dateFrom, dateTo, placaFilter],
  );

  const sumDetails = (d: FinExpenseDetails) =>
    COST_LABELS.reduce((acc, c) => acc + (Number(d[c.key]) || 0), 0);

  const costsByCategory = useMemo(() => {
    const totals = COST_LABELS.map((c) => ({
      ...c,
      valor: fExpenses.reduce((acc, e) => acc + (Number(e.detalhes?.[c.key]) || 0), 0),
    }));
    const grand = totals.reduce((a, t) => a + t.valor, 0);
    return totals
      .map((t) => ({ ...t, pct: grand > 0 ? (t.valor / grand) * 100 : 0 }))
      .sort((a, b) => b.valor - a.valor);
  }, [fExpenses]);

  const totalDespesasLancadas = costsByCategory.reduce((a, c) => a + c.valor, 0);
  const totalManutencaoRegistrada = fMaint.reduce((a, m) => a + (Number(m.custo) || 0), 0);
  // Despesas totais = categorias de despesa + ordens de manutenção
  const totalDespesas = totalDespesasLancadas + totalManutencaoRegistrada;
  const totalReceita = fFreights.reduce((a, f) => a + (f.valor || 0), 0);
  const totalRecebido = fFreights.reduce((a, f) => a + (f.recebido || 0), 0);
  const aReceber = totalReceita - totalRecebido;
  const lucro = totalReceita - totalDespesas;
  const margem = totalReceita > 0 ? (lucro / totalReceita) * 100 : 0;
  const totalKm = fExpenses.reduce((a, e) => a + (Number(e.km) || 0), 0);
  const custoPorKm = totalKm > 0 ? totalDespesas / totalKm : 0;
  const receitaPorKm = totalKm > 0 ? totalReceita / totalKm : 0;
  const manutPorKm = totalKm > 0 ? totalManutencaoRegistrada / totalKm : 0;
  const pctManutencao =
    totalDespesas > 0 ? (totalManutencaoRegistrada / totalDespesas) * 100 : 0;

  // Categorias de despesa + Manutenção, recalculadas sobre o total geral
  const allCostRows = useMemo(() => {
    const rows = [
      ...costsByCategory.map((c) => ({ key: c.key as string, label: c.label, valor: c.valor })),
      { key: "manutencao", label: "Manutenção", valor: totalManutencaoRegistrada },
    ];
    return rows
      .map((r) => ({
        ...r,
        pct: totalDespesas > 0 ? (r.valor / totalDespesas) * 100 : 0,
      }))
      .sort((a, b) => b.valor - a.valor);
  }, [costsByCategory, totalManutencaoRegistrada, totalDespesas]);

  // Manutenção agrupada por serviço (todos os serviços do cadastro)
  const maintByType = useMemo(() => {
    const map = new Map<string, { total: number; qtd: number }>();
    MAINT_SERVICES.forEach((s) => map.set(s, { total: 0, qtd: 0 }));
    fMaint.forEach((m) => {
      const key = m.categoriaServico || "Outros";
      const cur = map.get(key) || { total: 0, qtd: 0 };
      map.set(key, { total: cur.total + (Number(m.custo) || 0), qtd: cur.qtd + 1 });
    });
    return [...map.entries()]
      .map(([tipo, v]) => ({
        tipo,
        ...v,
        pct: totalManutencaoRegistrada > 0 ? (v.total / totalManutencaoRegistrada) * 100 : 0,
        media: v.qtd > 0 ? v.total / v.qtd : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [fMaint, totalManutencaoRegistrada]);

  // Consolidado por veículo
  const byVehicle = useMemo(() => {
    const placas = new Set<string>([
      ...vehicles.map((v) => v.placa.toUpperCase()),
      ...fExpenses.map((e) => e.placa.toUpperCase()),
      ...fFreights.map((f) => f.placa.toUpperCase()),
    ]);
    return [...placas]
      .filter((p) => !placaFilter || p === placaFilter.toUpperCase())
      .map((placa) => {
        const desp = fExpenses
          .filter((e) => e.placa.toUpperCase() === placa)
          .reduce((a, e) => a + (e.total || 0), 0);
        const rec = fFreights
          .filter((f) => f.placa.toUpperCase() === placa)
          .reduce((a, f) => a + (f.valor || 0), 0);
        const km = fExpenses
          .filter((e) => e.placa.toUpperCase() === placa)
          .reduce((a, e) => a + (Number(e.km) || 0), 0);
        const manut = fMaint
          .filter((m) => m.placa.toUpperCase() === placa)
          .reduce((a, m) => a + (Number(m.custo) || 0), 0);
        const despTotal = desp + manut;
        const litros = fExpenses
          .filter((e) => e.placa.toUpperCase() === placa)
          .reduce((a, e) => a + (Number(e.litros) || 0), 0);
        const diesel = fExpenses
          .filter((e) => e.placa.toUpperCase() === placa)
          .reduce((a, e) => a + (Number(e.detalhes?.abastecimento) || 0), 0);
        return {
          placa,
          modelo: vehicles.find((v) => v.placa.toUpperCase() === placa)?.modelo ?? "—",
          despesa: despTotal,
          receita: rec,
          manutencao: manut,
          km,
          litros,
          diesel,
          kmPorLitro: litros > 0 ? km / litros : 0,
          custoLitro: litros > 0 ? diesel / litros : 0,
          saldo: rec - despTotal,
          margemPct: rec > 0 ? ((rec - despTotal) / rec) * 100 : 0,
          custoKm: km > 0 ? despTotal / km : 0,
          receitaKm: km > 0 ? rec / km : 0,
        };
      })
      .sort((a, b) => b.receita - a.receita);
  }, [vehicles, fExpenses, fFreights, fMaint, placaFilter]);

  // Soma de uma categoria de custo lançada
  const sumKey = (k: keyof FinExpenseDetails) =>
    fExpenses.reduce((a, e) => a + (Number(e.detalhes?.[k]) || 0), 0);

  // MÉDIA DE CONSUMO (km/l e custo do diesel)
  const totalLitros = fExpenses.reduce((a, e) => a + (Number(e.litros) || 0), 0);
  const totalDiesel = sumKey("abastecimento");
  const kmPorLitro = totalLitros > 0 ? totalKm / totalLitros : 0;
  const litrosPorKm = totalKm > 0 ? totalLitros / totalKm : 0;
  const precoMedioLitro = totalLitros > 0 ? totalDiesel / totalLitros : 0;
  const custoDieselPorKm = totalKm > 0 ? totalDiesel / totalKm : 0;

  // DRE FINAL
  const dre = useMemo(() => {
    const diesel = sumKey("abastecimento") + sumKey("arla");
    const manutencao = totalManutencaoRegistrada;
    const operacional =
      sumKey("rastreador") + sumKey("depreciacao") + sumKey("diaria") + sumKey("salario") + sumKey("outros");
    const comissoes = sumKey("comissao");
    const prestacao = sumKey("prestacao");
    const ipva = sumKey("ipva");
    const seguro = sumKey("seguro");
    const resultado =
      totalReceita - diesel - manutencao - operacional - comissoes - prestacao - ipva - seguro;
    return {
      diesel,
      manutencao,
      operacional,
      comissoes,
      prestacao,
      ipva,
      seguro,
      resultado,
      pctLiquido: totalReceita > 0 ? (resultado / totalReceita) * 100 : 0,
    };
  }, [fExpenses, totalManutencaoRegistrada, totalReceita]);

  // MARGEM POR VIAGEM (custo do veículo rateado pela participação na receita)
  const byTrip = useMemo(() => {
    return fFreights
      .map((f) => {
        const placa = f.placa.toUpperCase();
        const veh = byVehicle.find((v) => v.placa === placa);
        const receitaPlaca = veh?.receita ?? 0;
        const custoPlaca = veh?.despesa ?? 0;
        const share = receitaPlaca > 0 ? (f.valor || 0) / receitaPlaca : 0;
        const custo = custoPlaca * share;
        const margem = (f.valor || 0) - custo;
        return {
          id: f.id,
          data: f.data,
          rota: `${f.origem} → ${f.destino}`,
          placa,
          receita: f.valor || 0,
          custo,
          margem,
          margemPct: (f.valor || 0) > 0 ? (margem / (f.valor || 0)) * 100 : 0,
        };
      })
      .sort((a, b) => (a.data < b.data ? 1 : -1));
  }, [fFreights, byVehicle]);

  const margemMediaViagem =
    byTrip.length > 0 ? byTrip.reduce((a, t) => a + t.margemPct, 0) / byTrip.length : 0;


  // AUDITORIA DE CÁLCULOS
  const auditoria = useMemo(() => {
    const issues: { tipo: string; descricao: string; diferenca?: number }[] = [];

    fExpenses.forEach((e) => {
      const soma = sumDetails(e.detalhes);
      const diff = Number((soma - (e.total || 0)).toFixed(2));
      if (Math.abs(diff) > 0.009) {
        issues.push({
          tipo: "Total divergente",
          descricao: `Despesa ${e.placa} (${formatDateBR(e.data)}): soma dos itens ${formatBRL(soma)} ≠ total lançado ${formatBRL(e.total || 0)}`,
          diferenca: diff,
        });
      }
      if (!e.km || e.km <= 0) {
        issues.push({
          tipo: "KM ausente",
          descricao: `Despesa ${e.placa} (${formatDateBR(e.data)}) sem quilometragem — custo por km não considerado.`,
        });
      }
      if (soma === 0) {
        issues.push({
          tipo: "Despesa zerada",
          descricao: `Despesa ${e.placa} (${formatDateBR(e.data)}) sem valores lançados.`,
        });
      }
    });

    fFreights.forEach((f) => {
      if ((f.recebido || 0) > (f.valor || 0)) {
        issues.push({
          tipo: "Recebido maior que o frete",
          descricao: `Frete ${f.origem} → ${f.destino} (${formatDateBR(f.data)}): recebido ${formatBRL(f.recebido)} acima do valor ${formatBRL(f.valor)}`,
          diferenca: (f.recebido || 0) - (f.valor || 0),
        });
      }
    });

    fMaint.forEach((m) => {
      if (!m.custo || Number(m.custo) <= 0) {
        issues.push({
          tipo: "Manutenção sem custo",
          descricao: `Ordem de ${m.categoriaServico || "serviço"} da placa ${m.placa} (${formatDateBR(m.data)}) sem valor lançado.`,
        });
      }
    });


    const placasSemVeiculo = [
      ...new Set(
        [...fExpenses.map((e) => e.placa), ...fFreights.map((f) => f.placa)]
          .map((p) => p.toUpperCase())
          .filter((p) => !vehicles.some((v) => v.placa.toUpperCase() === p)),
      ),
    ];
    placasSemVeiculo.forEach((p) =>
      issues.push({
        tipo: "Placa não cadastrada",
        descricao: `Lançamentos para a placa ${p}, que não está na frota.`,
      }),
    );

    return issues;
  }, [fExpenses, fFreights, fMaint, costsByCategory, totalManutencaoRegistrada, vehicles]);

  const periodoLabel =
    dateFrom || dateTo
      ? `${dateFrom ? formatDateBR(dateFrom) : "início"} até ${dateTo ? formatDateBR(dateTo) : "hoje"}`
      : "Todo o período";

  const handleExportCSV = () => {
    const rows: (string | number)[][] = [];
    rows.push(["RELATÓRIO FINANCEIRO — GDALog"]);
    rows.push(["Período", periodoLabel]);
    rows.push(["Veículo", placaFilter || "Todos"]);
    rows.push([]);
    rows.push(["RESUMO"]);
    rows.push(["Receita de fretes", totalReceita]);
    rows.push(["Recebido", totalRecebido]);
    rows.push(["A receber", aReceber]);
    rows.push(["Despesas totais", totalDespesas]);
    rows.push(["Resultado", lucro]);
    rows.push(["Margem (%)", margem.toFixed(1)]);
    rows.push(["KM rodados", totalKm]);
    rows.push(["Custo por KM", custoPorKm.toFixed(2)]);
    rows.push([]);
    rows.push(["CUSTOS POR CATEGORIA", "Valor", "% do total"]);
    allCostRows.forEach((c) => rows.push([c.label, c.valor, c.pct.toFixed(1)]));
    rows.push(["TOTAL", totalDespesas, "100"]);
    rows.push([]);
    rows.push(["MANUTENÇÃO POR SERVIÇO", "Ordens", "Valor", "Média por ordem", "% manutenção"]);
    maintByType.forEach((m) =>
      rows.push([m.tipo, m.qtd, m.total, m.media.toFixed(2), m.pct.toFixed(1)]),
    );
    rows.push(["TOTAL MANUTENÇÃO", "", totalManutencaoRegistrada]);
    rows.push([]);
    rows.push(["POR VEÍCULO", "Modelo", "Receita", "Despesa", "Saldo", "KM", "Custo/KM"]);
    byVehicle.forEach((v) =>
      rows.push([v.placa, v.modelo, v.receita, v.despesa, v.saldo, v.km, v.custoKm.toFixed(2)]),
    );
    rows.push([]);
    rows.push(["DRE FINAL", "Valor", "% da receita"]);
    rows.push(["Receita total", totalReceita, "100"]);
    rows.push(["(-) Diesel / Arla", dre.diesel, ((dre.diesel / (totalReceita || 1)) * 100).toFixed(1)]);
    rows.push(["(-) Manutenção", dre.manutencao, ((dre.manutencao / (totalReceita || 1)) * 100).toFixed(1)]);
    rows.push(["(-) Custo operacional", dre.operacional, ((dre.operacional / (totalReceita || 1)) * 100).toFixed(1)]);
    rows.push(["(-) Comissões de motorista", dre.comissoes, ((dre.comissoes / (totalReceita || 1)) * 100).toFixed(1)]);
    rows.push(["(-) Prestação de veículos", dre.prestacao, ((dre.prestacao / (totalReceita || 1)) * 100).toFixed(1)]);
    rows.push(["(-) IPVA", dre.ipva, ((dre.ipva / (totalReceita || 1)) * 100).toFixed(1)]);
    rows.push(["(-) Seguro", dre.seguro, ((dre.seguro / (totalReceita || 1)) * 100).toFixed(1)]);
    rows.push(["= Resultado líquido", dre.resultado, dre.pctLiquido.toFixed(1)]);
    rows.push([]);
    rows.push(["MÉDIA DE CONSUMO", "KM", "Litros", "km/l", "R$/litro"]);
    byVehicle.forEach((v) =>
      rows.push([v.placa, v.km, v.litros, v.kmPorLitro.toFixed(2), v.custoLitro.toFixed(2)]),
    );
    rows.push(["TOTAL", totalKm, totalLitros, kmPorLitro.toFixed(2), precoMedioLitro.toFixed(2)]);
    rows.push([]);
    rows.push(["MARGEM POR VIAGEM", "Rota", "Placa", "Receita", "Custo rateado", "Margem", "Margem %"]);
    byTrip.forEach((t) =>
      rows.push([
        formatDateBR(t.data),
        t.rota,
        t.placa,
        t.receita,
        t.custo.toFixed(2),
        t.margem.toFixed(2),
        t.margemPct.toFixed(1),
      ]),
    );
    rows.push([]);
    rows.push(["MARGEM FINAL POR PLACA", "Receita", "Custo", "Margem", "Margem %", "Receita/KM", "Custo/KM"]);
    byVehicle.forEach((v) =>
      rows.push([
        v.placa,
        v.receita,
        v.despesa,
        v.saldo,
        v.margemPct.toFixed(1),
        v.receitaKm.toFixed(2),
        v.custoKm.toFixed(2),
      ]),
    );
    rows.push([]);
    rows.push(["AUDITORIA", "Descrição"]);
    if (auditoria.length === 0) rows.push(["OK", "Nenhuma inconsistência encontrada"]);
    auditoria.forEach((i) => rows.push([i.tipo, i.descricao]));

    const csv = rows
      .map((r) =>
        r
          .map((cell) => {
            const s = typeof cell === "number" ? String(cell).replace(".", ",") : String(cell ?? "");
            return `"${s.replace(/"/g, '""')}"`;
          })
          .join(";"),
      )
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-financeiro-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 print-area">
      {/* Header + Ações */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-[#0c192c] tracking-tight">Financeiro</h1>
          <p className="text-slate-500 text-xs sm:text-sm">
            Consolidação de todos os custos, receitas e conferência dos cálculos · {periodoLabel}
          </p>
        </div>
        <div className="flex items-center gap-2 no-print">
          <Button
            onClick={handleExportCSV}
            className="bg-white border border-slate-200 text-[#0c192c] hover:bg-slate-50 font-semibold rounded-xl px-4 py-2 flex items-center gap-1.5 shadow-sm cursor-pointer text-xs sm:text-sm"
          >
            <Download className="w-4 h-4" /> Exportar CSV
          </Button>
          <Button
            onClick={() => window.print()}
            className="bg-[#0c192c] hover:bg-[#162a45] text-white font-semibold rounded-xl px-4 py-2 flex items-center gap-1.5 shadow cursor-pointer text-xs sm:text-sm"
          >
            <Printer className="w-4 h-4" /> Imprimir
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 no-print">
        <div>
          <Label className="text-xs font-semibold text-slate-700">Data inicial</Label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="mt-1 bg-slate-50 border-slate-200"
          />
        </div>
        <div>
          <Label className="text-xs font-semibold text-slate-700">Data final</Label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="mt-1 bg-slate-50 border-slate-200"
          />
        </div>
        <div>
          <Label className="text-xs font-semibold text-slate-700">Veículo</Label>
          <select
            value={placaFilter}
            onChange={(e) => setPlacaFilter(e.target.value)}
            className="mt-1 w-full h-9 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm"
          >
            <option value="">Todos os veículos</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.placa}>
                {v.placa} — {v.modelo}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 print-break">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase">
            <TrendingUp className="w-4 h-4 text-[#16a34a]" /> Receita
          </div>
          <div className="text-xl font-black text-[#16a34a] mt-1">{formatBRL(totalReceita)}</div>
          <div className="text-[11px] text-slate-400 mt-1">A receber {formatBRL(aReceber)}</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase">
            <TrendingDown className="w-4 h-4 text-[#f25c05]" /> Despesas
          </div>
          <div className="text-xl font-black text-[#f25c05] mt-1">{formatBRL(totalDespesas)}</div>
          <div className="text-[11px] text-slate-400 mt-1">
            {fExpenses.length} lançamentos · manutenção {formatBRL(totalManutencaoRegistrada)}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase">
            <Wallet className="w-4 h-4 text-[#0c192c]" /> Resultado
          </div>
          <div
            className={`text-xl font-black mt-1 ${lucro >= 0 ? "text-[#16a34a]" : "text-red-600"}`}
          >
            {formatBRL(lucro)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Margem {margem.toFixed(1)}%</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="text-slate-500 text-xs font-semibold uppercase">Custo por KM</div>
          <div className="text-xl font-black text-[#0c192c] mt-1">{formatBRL(custoPorKm)}</div>
          <div className="text-[11px] text-slate-400 mt-1">
            {totalKm.toLocaleString("pt-BR")} km · receita/km {formatBRL(receitaPorKm)}
          </div>
        </div>
      </div>

      {/* DRE FINAL */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 print-break">
        <div className="flex flex-wrap items-end justify-between gap-2 mb-4">
          <h2 className="font-extrabold text-[#0c192c]">DRE final da operação</h2>
          <span className="text-[11px] text-slate-400">{periodoLabel}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[420px]">
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="py-2 font-bold text-[#0c192c]">Receita total de fretes</td>
                <td className="py-2 text-right font-black text-[#16a34a]">{formatBRL(totalReceita)}</td>
                <td className="py-2 text-right text-[11px] text-slate-400 w-20">100,0%</td>
              </tr>
              {[
                { label: "(−) Diesel / Arla", valor: dre.diesel },
                { label: "(−) Manutenção", valor: dre.manutencao },
                { label: "(−) Custo operacional", valor: dre.operacional },
                { label: "(−) Comissões de motorista", valor: dre.comissoes },
                { label: "(−) Prestação de veículos", valor: dre.prestacao },
                { label: "(−) IPVA / Licenciamento", valor: dre.ipva },
                { label: "(−) Seguro", valor: dre.seguro },
              ].map((r) => (
                <tr key={r.label} className="border-b border-slate-50">
                  <td className="py-2 text-slate-600 font-semibold">{r.label}</td>
                  <td className="py-2 text-right font-semibold text-[#f25c05]">
                    {formatBRL(r.valor)}
                  </td>
                  <td className="py-2 text-right text-[11px] text-slate-400">
                    {(totalReceita > 0 ? (r.valor / totalReceita) * 100 : 0).toFixed(1)}%
                  </td>
                </tr>
              ))}
              <tr>
                <td className="py-3 font-black text-[#0c192c]">= Resultado líquido</td>
                <td
                  className={`py-3 text-right font-black ${dre.resultado >= 0 ? "text-[#16a34a]" : "text-red-600"}`}
                >
                  {formatBRL(dre.resultado)}
                </td>
                <td
                  className={`py-3 text-right font-black ${dre.resultado >= 0 ? "text-[#16a34a]" : "text-red-600"}`}
                >
                  {dre.pctLiquido.toFixed(1)}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-slate-400 mt-2">
          Percentual líquido da operação: {dre.pctLiquido.toFixed(1)}% da receita total.
        </p>
      </div>

      {/* MÉDIA DE CONSUMO */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 print-break">
        <div className="flex flex-wrap items-end justify-between gap-2 mb-4">
          <h2 className="font-extrabold text-[#0c192c]">Média de consumo</h2>
          <span className="text-[11px] text-slate-400">
            {totalLitros.toLocaleString("pt-BR")} L · {totalKm.toLocaleString("pt-BR")} km
          </span>
        </div>
        {totalLitros === 0 ? (
          <p className="text-sm text-slate-500">
            Informe os <strong>litros abastecidos</strong> no lançamento de despesas para calcular a
            média de consumo.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="text-[11px] uppercase text-slate-500 font-semibold">Média km/l</div>
                <div className="text-lg font-black text-[#0c192c]">
                  {kmPorLitro.toFixed(2)} km/l
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="text-[11px] uppercase text-slate-500 font-semibold">Litros por km</div>
                <div className="text-lg font-black text-[#0c192c]">{litrosPorKm.toFixed(3)} L</div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="text-[11px] uppercase text-slate-500 font-semibold">Preço médio/litro</div>
                <div className="text-lg font-black text-[#0c192c]">{formatBRL(precoMedioLitro)}</div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="text-[11px] uppercase text-slate-500 font-semibold">Diesel por km</div>
                <div className="text-lg font-black text-[#0c192c]">{formatBRL(custoDieselPorKm)}</div>
              </div>
            </div>
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-sm min-w-[460px]">
                <thead>
                  <tr className="text-left text-[11px] uppercase text-slate-400 border-b border-slate-100">
                    <th className="py-2">Veículo</th>
                    <th className="py-2 text-right">KM</th>
                    <th className="py-2 text-right">Litros</th>
                    <th className="py-2 text-right">Média km/l</th>
                    <th className="py-2 text-right">R$/litro</th>
                  </tr>
                </thead>
                <tbody>
                  {byVehicle.map((v) => (
                    <tr key={v.placa} className="border-b border-slate-50">
                      <td className="py-2 font-bold text-slate-800">{v.placa}</td>
                      <td className="py-2 text-right text-slate-500">
                        {v.km.toLocaleString("pt-BR")}
                      </td>
                      <td className="py-2 text-right text-slate-500">
                        {v.litros.toLocaleString("pt-BR")}
                      </td>
                      <td className="py-2 text-right font-bold text-[#0c192c]">
                        {v.kmPorLitro > 0 ? `${v.kmPorLitro.toFixed(2)} km/l` : "—"}
                      </td>
                      <td className="py-2 text-right text-slate-500">
                        {v.custoLitro > 0 ? formatBRL(v.custoLitro) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* MARGEM POR VIAGEM */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 print-break">
        <div className="flex flex-wrap items-end justify-between gap-2 mb-4">
          <h2 className="font-extrabold text-[#0c192c]">Margem por viagem</h2>
          <span className="text-[11px] text-slate-400">
            {byTrip.length} viagens · margem média {margemMediaViagem.toFixed(1)}%
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[520px]">
            <thead>
              <tr className="text-left text-[11px] uppercase text-slate-400 border-b border-slate-100">
                <th className="py-2">Data</th>
                <th className="py-2">Rota / Placa</th>
                <th className="py-2 text-right">Receita</th>
                <th className="py-2 text-right">Custo rateado</th>
                <th className="py-2 text-right">Margem</th>
                <th className="py-2 text-right">%</th>
              </tr>
            </thead>
            <tbody>
              {byTrip.map((t) => (
                <tr key={t.id} className="border-b border-slate-50">
                  <td className="py-2 text-slate-500 text-xs whitespace-nowrap">
                    {formatDateBR(t.data)}
                  </td>
                  <td className="py-2">
                    <div className="font-semibold text-slate-800 text-xs">{t.rota}</div>
                    <div className="text-[11px] text-slate-400">{t.placa}</div>
                  </td>
                  <td className="py-2 text-right text-[#16a34a] font-semibold">
                    {formatBRL(t.receita)}
                  </td>
                  <td className="py-2 text-right text-[#f25c05] font-semibold">
                    {formatBRL(t.custo)}
                  </td>
                  <td
                    className={`py-2 text-right font-bold ${t.margem >= 0 ? "text-slate-800" : "text-red-600"}`}
                  >
                    {formatBRL(t.margem)}
                  </td>
                  <td
                    className={`py-2 text-right font-bold ${t.margemPct >= 0 ? "text-slate-500" : "text-red-600"}`}
                  >
                    {t.margemPct.toFixed(1)}%
                  </td>
                </tr>
              ))}
              {byTrip.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-slate-400">
                    Sem fretes no período selecionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-slate-400 mt-3">
          O custo de cada viagem é rateado a partir dos custos do veículo, na proporção da receita da
          viagem sobre a receita total daquela placa.
        </p>
      </div>

      {/* APURAÇÃO FINAL DE MARGEM POR PLACA */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 print-break">
        <h2 className="font-extrabold text-[#0c192c] mb-4">Apuração final de margem por placa</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="text-left text-[11px] uppercase text-slate-400 border-b border-slate-100">
                <th className="py-2">Placa</th>
                <th className="py-2 text-right">Receita</th>
                <th className="py-2 text-right">Custo total</th>
                <th className="py-2 text-right">Margem R$</th>
                <th className="py-2 text-right">Margem %</th>
                <th className="py-2 text-right">Receita/KM</th>
                <th className="py-2 text-right">Custo/KM</th>
              </tr>
            </thead>
            <tbody>
              {byVehicle.map((v) => (
                <tr key={v.placa} className="border-b border-slate-50">
                  <td className="py-2">
                    <div className="font-bold text-slate-800">{v.placa}</div>
                    <div className="text-[11px] text-slate-400">{v.modelo}</div>
                  </td>
                  <td className="py-2 text-right text-[#16a34a] font-semibold">
                    {formatBRL(v.receita)}
                  </td>
                  <td className="py-2 text-right text-[#f25c05] font-semibold">
                    {formatBRL(v.despesa)}
                  </td>
                  <td
                    className={`py-2 text-right font-bold ${v.saldo >= 0 ? "text-slate-800" : "text-red-600"}`}
                  >
                    {formatBRL(v.saldo)}
                  </td>
                  <td
                    className={`py-2 text-right font-black ${v.margemPct >= 0 ? "text-[#16a34a]" : "text-red-600"}`}
                  >
                    {v.margemPct.toFixed(1)}%
                  </td>
                  <td className="py-2 text-right text-slate-500">{formatBRL(v.receitaKm)}</td>
                  <td className="py-2 text-right text-slate-500">{formatBRL(v.custoKm)}</td>
                </tr>
              ))}
              <tr>
                <td className="py-2 font-black text-[#0c192c]">Total da operação</td>
                <td className="py-2 text-right font-black text-[#0c192c]">
                  {formatBRL(totalReceita)}
                </td>
                <td className="py-2 text-right font-black text-[#0c192c]">
                  {formatBRL(totalDespesas)}
                </td>
                <td className="py-2 text-right font-black text-[#0c192c]">{formatBRL(lucro)}</td>
                <td className="py-2 text-right font-black text-[#0c192c]">
                  {margem.toFixed(1)}%
                </td>
                <td className="py-2 text-right font-black text-[#0c192c]">
                  {formatBRL(receitaPorKm)}
                </td>
                <td className="py-2 text-right font-black text-[#0c192c]">
                  {formatBRL(custoPorKm)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>


      {/* Custos por categoria */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 print-break">
        <h2 className="font-extrabold text-[#0c192c] mb-4">Custos por categoria</h2>
        <div className="overflow-x-auto pb-2">
          <div className="min-w-[320px] space-y-2">
            {allCostRows.map((c) => (
              <div key={c.key} className="flex items-center gap-3">
                <div className="w-36 sm:w-40 text-xs font-semibold text-slate-600 shrink-0">{c.label}</div>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden min-w-[80px]">
                  <div
                    className={`h-full rounded-full ${c.key === "manutencao" ? "bg-[#0c192c]" : "bg-[#f25c05]"}`}
                    style={{ width: `${Math.max(c.pct, 0)}%` }}
                  />
                </div>
                <div className="w-24 sm:w-28 text-right text-xs font-bold text-slate-800 shrink-0">
                  {formatBRL(c.valor)}
                </div>
                <div className="w-12 text-right text-[11px] text-slate-400 shrink-0">{c.pct.toFixed(1)}%</div>
              </div>
            ))}
          </div>
        </div>
        <div className="border-t border-slate-100 mt-4 pt-3 space-y-1">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Despesas lançadas</span>
            <span>{formatBRL(totalDespesasLancadas)}</span>
          </div>
          <div className="flex justify-between text-xs text-slate-500">
            <span>Manutenção ({pctManutencao.toFixed(1)}% do total)</span>
            <span>{formatBRL(totalManutencaoRegistrada)}</span>
          </div>
          <div className="flex justify-between text-sm font-black text-[#0c192c] pt-1">
            <span>Total de despesas</span>
            <span>{formatBRL(totalDespesas)}</span>
          </div>
        </div>
      </div>

      {/* Manutenção */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 print-break">
        <div className="flex flex-wrap items-end justify-between gap-2 mb-4">
          <h2 className="font-extrabold text-[#0c192c]">Categoria de Serviço / Manutenção</h2>
          <div className="text-[11px] text-slate-400">
            {fMaint.length} ordens · {formatBRL(manutPorKm)}/km
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase text-slate-400 border-b border-slate-100">
                <th className="py-2">Serviço</th>
                <th className="py-2 text-center">Ordens</th>
                <th className="py-2 text-right">Custo</th>
                <th className="py-2 text-right">Média/ordem</th>
                <th className="py-2 text-right">% manut.</th>
              </tr>
            </thead>
            <tbody>
              {maintByType.map((m) => (
                <tr key={m.tipo} className="border-b border-slate-50">
                  <td className="py-2 font-semibold text-slate-700">{m.tipo}</td>
                  <td className="py-2 text-center text-slate-500">{m.qtd}</td>
                  <td className="py-2 text-right font-bold text-slate-800">
                    {formatBRL(m.total)}
                  </td>
                  <td className="py-2 text-right text-slate-500">{formatBRL(m.media)}</td>
                  <td className="py-2 text-right text-slate-400">{m.pct.toFixed(1)}%</td>
                </tr>
              ))}
              <tr>
                <td className="py-2 font-black text-[#0c192c]">Total</td>
                <td className="py-2 text-center font-black text-[#0c192c]">{fMaint.length}</td>
                <td className="py-2 text-right font-black text-[#0c192c]">
                  {formatBRL(totalManutencaoRegistrada)}
                </td>
                <td className="py-2 text-right font-black text-[#0c192c]">
                  {formatBRL(fMaint.length > 0 ? totalManutencaoRegistrada / fMaint.length : 0)}
                </td>
                <td className="py-2 text-right font-black text-[#0c192c]">100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>


      {/* Por veículo */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 print-break">
        <h2 className="font-extrabold text-[#0c192c] mb-4">Resultado por veículo</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase text-slate-400 border-b border-slate-100">
                <th className="py-2">Veículo</th>
                <th className="py-2 text-right">Receita</th>
                <th className="py-2 text-right">Despesa</th>
                <th className="py-2 text-right">Saldo</th>
                <th className="py-2 text-right">KM</th>
                <th className="py-2 text-right">Custo/KM</th>
              </tr>
            </thead>
            <tbody>
              {byVehicle.map((v) => (
                <tr key={v.placa} className="border-b border-slate-50">
                  <td className="py-2">
                    <div className="font-bold text-slate-800">{v.placa}</div>
                    <div className="text-[11px] text-slate-400">{v.modelo}</div>
                  </td>
                  <td className="py-2 text-right text-[#16a34a] font-semibold">
                    {formatBRL(v.receita)}
                  </td>
                  <td className="py-2 text-right text-[#f25c05] font-semibold">
                    {formatBRL(v.despesa)}
                  </td>
                  <td
                    className={`py-2 text-right font-bold ${v.saldo >= 0 ? "text-slate-800" : "text-red-600"}`}
                  >
                    {formatBRL(v.saldo)}
                  </td>
                  <td className="py-2 text-right text-slate-500">
                    {v.km.toLocaleString("pt-BR")}
                  </td>
                  <td className="py-2 text-right text-slate-500">{formatBRL(v.custoKm)}</td>
                </tr>
              ))}
              {byVehicle.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-slate-400">
                    Sem dados no período selecionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Auditoria */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 print-break">
        <h2 className="font-extrabold text-[#0c192c] mb-4">Conferência dos cálculos</h2>
        {auditoria.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-[#16a34a] font-semibold">
            <CheckCircle2 className="w-5 h-5" /> Todos os lançamentos conferem — nenhuma
            inconsistência encontrada.
          </div>
        ) : (
          <div className="space-y-2">
            {auditoria.map((i, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3"
              >
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-amber-800 uppercase">{i.tipo}</div>
                  <div className="text-sm text-slate-700">{i.descricao}</div>
                  {i.diferenca !== undefined && (
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Diferença: {formatBRL(i.diferenca)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Extrato de lançamentos com rolagem mobile otimizada */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 print-break">
        <h2 className="font-extrabold text-[#0c192c] mb-4">Extrato de lançamentos</h2>
        <div className="max-h-[380px] overflow-y-auto overflow-x-auto rounded-xl border border-slate-100 p-1">
          <table className="w-full text-sm min-w-[500px]">
            <thead className="sticky top-0 bg-white shadow-xs z-10">
              <tr className="text-left text-[11px] uppercase text-slate-400 border-b border-slate-100">
                <th className="py-2 px-2">Data</th>
                <th className="py-2 px-2">Tipo</th>
                <th className="py-2 px-2">Descrição</th>
                <th className="py-2 px-2 text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {[
                ...fFreights.map((f) => ({
                  data: f.data,
                  tipo: "Receita",
                  desc: `Frete ${f.origem} → ${f.destino} · ${f.placa}`,
                  valor: f.valor,
                })),
                ...fExpenses.map((e) => ({
                  data: e.data,
                  tipo: "Despesa",
                  desc: `Despesa ${e.placa} · ${e.motorista}`,
                  valor: -(e.total || 0),
                })),
                ...fMaint.map((m) => ({
                  data: m.data,
                  tipo: "Manutenção",
                  desc: `${m.categoriaServico} · ${m.placa}`,
                  valor: -(m.custo || 0),
                })),
              ]
                .sort((a, b) => (a.data < b.data ? 1 : -1))
                .map((r, idx) => (
                  <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="py-2.5 px-2 text-slate-500 text-xs whitespace-nowrap">{formatDateBR(r.data)}</td>
                    <td className="py-2.5 px-2">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {r.tipo}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-slate-700 text-xs">{r.desc}</td>
                    <td
                      className={`py-2.5 px-2 text-right font-bold text-xs whitespace-nowrap ${r.valor >= 0 ? "text-[#16a34a]" : "text-[#f25c05]"}`}
                    >
                      {formatBRL(r.valor)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-slate-400 mt-3">
          Observação: ordens de manutenção são exibidas para conferência e não são somadas ao total
          de despesas, que considera apenas os lançamentos da aba Despesas.
        </p>
      </div>
    </div>
  );
}