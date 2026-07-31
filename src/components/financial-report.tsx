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
  outros: number;
}

export interface FinExpense {
  id: string;
  placa: string;
  data: string;
  motorista: string;
  km: number;
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
  { key: "abastecimento", label: "Abastecimento" },
  { key: "arla", label: "Arla" },
  { key: "rastreador", label: "Rastreador" },
  { key: "depreciacao", label: "Depreciação" },
  { key: "ipva", label: "IPVA / Licenciamento" },
  { key: "diaria", label: "Diária" },
  { key: "salario", label: "Salário" },
  { key: "outros", label: "Outros" },
];

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
        return {
          placa,
          modelo: vehicles.find((v) => v.placa.toUpperCase() === placa)?.modelo ?? "—",
          despesa: desp,
          receita: rec,
          manutencao: manut,
          km,
          saldo: rec - desp,
          custoKm: km > 0 ? desp / km : 0,
        };
      })
      .sort((a, b) => b.receita - a.receita);
  }, [vehicles, fExpenses, fFreights, fMaint, placaFilter]);

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

    const diffManut = Number((totalManutencaoRegistrada - 0).toFixed(2));
    if (Math.abs(diffManut) > 0.009) {
      issues.push({
        tipo: "Manutenção x Despesas",
        descricao: `Ordens de manutenção somam ${formatBRL(totalManutencaoRegistrada)}, mas não há mais categoria de despesa vinculada a óleo, manutenção ou pneus.`,
        diferenca: diffManut,
      });
    }

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
  }, [fExpenses, fFreights, costsByCategory, totalManutencaoRegistrada, vehicles]);

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
    costsByCategory.forEach((c) => rows.push([c.label, c.valor, c.pct.toFixed(1)]));
    rows.push(["TOTAL", totalDespesas, "100"]);
    rows.push([]);
    rows.push(["MANUTENÇÃO POR SERVIÇO", "Ordens", "Valor"]);
    maintByType.forEach(([tipo, v]) => rows.push([tipo, v.qtd, v.total]));
    rows.push([]);
    rows.push(["POR VEÍCULO", "Modelo", "Receita", "Despesa", "Saldo", "KM", "Custo/KM"]);
    byVehicle.forEach((v) =>
      rows.push([v.placa, v.modelo, v.receita, v.despesa, v.saldo, v.km, v.custoKm.toFixed(2)]),
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
          <div className="text-[11px] text-slate-400 mt-1">{fExpenses.length} lançamentos</div>
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

      {/* Custos por categoria */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 print-break">
        <h2 className="font-extrabold text-[#0c192c] mb-4">Custos por categoria</h2>
        <div className="space-y-2">
          {costsByCategory.map((c) => (
            <div key={c.key} className="flex items-center gap-3">
              <div className="w-40 text-xs font-semibold text-slate-600 shrink-0">{c.label}</div>
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#f25c05] rounded-full"
                  style={{ width: `${Math.max(c.pct, 0)}%` }}
                />
              </div>
              <div className="w-28 text-right text-xs font-bold text-slate-800">
                {formatBRL(c.valor)}
              </div>
              <div className="w-12 text-right text-[11px] text-slate-400">{c.pct.toFixed(1)}%</div>
            </div>
          ))}
        </div>
        <div className="flex justify-between border-t border-slate-100 mt-4 pt-3 text-sm font-black text-[#0c192c]">
          <span>Total de despesas</span>
          <span>{formatBRL(totalDespesas)}</span>
        </div>
      </div>

      {/* Manutenção */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 print-break">
        <h2 className="font-extrabold text-[#0c192c] mb-4">Manutenção por tipo de serviço</h2>
        {maintByType.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhuma ordem de manutenção no período.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase text-slate-400 border-b border-slate-100">
                  <th className="py-2">Serviço</th>
                  <th className="py-2 text-center">Ordens</th>
                  <th className="py-2 text-right">Custo</th>
                </tr>
              </thead>
              <tbody>
                {maintByType.map(([tipo, v]) => (
                  <tr key={tipo} className="border-b border-slate-50">
                    <td className="py-2 font-semibold text-slate-700">{tipo}</td>
                    <td className="py-2 text-center text-slate-500">{v.qtd}</td>
                    <td className="py-2 text-right font-bold text-slate-800">
                      {formatBRL(v.total)}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td className="py-2 font-black text-[#0c192c]">Total</td>
                  <td />
                  <td className="py-2 text-right font-black text-[#0c192c]">
                    {formatBRL(totalManutencaoRegistrada)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
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

      {/* Extrato de lançamentos */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 print-break">
        <h2 className="font-extrabold text-[#0c192c] mb-4">Extrato de lançamentos</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase text-slate-400 border-b border-slate-100">
                <th className="py-2">Data</th>
                <th className="py-2">Tipo</th>
                <th className="py-2">Descrição</th>
                <th className="py-2 text-right">Valor</th>
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
                  <tr key={idx} className="border-b border-slate-50">
                    <td className="py-2 text-slate-500">{formatDateBR(r.data)}</td>
                    <td className="py-2">
                      <span className="text-[11px] font-bold uppercase text-slate-600">
                        {r.tipo}
                      </span>
                    </td>
                    <td className="py-2 text-slate-700">{r.desc}</td>
                    <td
                      className={`py-2 text-right font-bold ${r.valor >= 0 ? "text-[#16a34a]" : "text-[#f25c05]"}`}
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