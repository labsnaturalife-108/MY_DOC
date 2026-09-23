"use client";

import React, { useState, useEffect } from "react";
import { 
  LineChart as LineChartIcon, 
  Plus, 
  Trash2, 
  TrendingUp, 
  Calendar, 
  CheckCircle2, 
  AlertCircle,
  X
} from "lucide-react";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ReferenceLine 
} from "recharts";
import { Patient, LabMetric, api } from "@/lib/api";

interface LabChartsProps {
  patient: Patient;
}

export const LabCharts: React.FC<LabChartsProps> = ({ patient }) => {
  const [metrics, setMetrics] = useState<LabMetric[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMetric, setNewMetric] = useState<Partial<LabMetric>>({
    metric_name: "Ферритин",
    value: 75,
    unit: "мкг/л",
    reference_min: 30,
    reference_max: 200,
    record_date: new Date().toISOString().split("T")[0],
    notes: ""
  });

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const data = await api.getLabMetrics(patient.id);
      setMetrics(data);
      if (data.length > 0 && !selectedMetric) {
        setSelectedMetric(data[0].metric_name);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, [patient.id]);

  const uniqueMetricNames = Array.from(new Set(metrics.map((m) => m.metric_name)));

  const filteredData = metrics
    .filter((m) => m.metric_name === selectedMetric)
    .sort((a, b) => new Date(a.record_date).getTime() - new Date(b.record_date).getTime());

  const currentRefMin = filteredData.length > 0 ? filteredData[0].reference_min : null;
  const currentRefMax = filteredData.length > 0 ? filteredData[0].reference_max : null;
  const currentUnit = filteredData.length > 0 ? filteredData[0].unit : "";

  const handleAddMetric = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMetric.metric_name || newMetric.value === undefined) return;
    try {
      await api.addLabMetric(patient.id, newMetric);
      setShowAddModal(false);
      await loadMetrics();
      setSelectedMetric(newMetric.metric_name);
    } catch (err) {
      alert("Ошибка добавления показателя: " + err);
    }
  };

  const handleDeleteMetric = async (id: number) => {
    if (!confirm("Удалить эту запись?")) return;
    try {
      await api.deleteLabMetric(patient.id, id);
      setMetrics(metrics.filter((m) => m.id !== id));
    } catch (err) {
      alert("Ошибка удаления: " + err);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top action bar */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <div className="p-2 rounded-xl bg-zinc-800 border border-zinc-700/80 text-zinc-300">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">Динамика лабораторных показателей</h3>
            <p className="text-xs text-zinc-400">Графики изменения биомаркеров по датам сдачи</p>
          </div>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
          {uniqueMetricNames.length > 0 && (
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="bg-zinc-950 border border-zinc-700 text-zinc-200 text-sm rounded-xl px-3 py-2 outline-none focus:border-zinc-500"
            >
              {uniqueMetricNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 bg-zinc-100 hover:bg-white text-zinc-950 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md transition whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Добавить анализ вручную
          </button>
        </div>
      </div>

      {/* Chart Section */}
      {filteredData.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center">
          <LineChartIcon className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
          <p className="text-sm text-zinc-300 font-medium">Нет данных для построения графика</p>
          <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
            Загрузите бланк анализов в папку «Лабораторные анализы» или добавьте показатели вручную.
          </p>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                {selectedMetric}
                <span className="text-xs font-normal text-zinc-400">({currentUnit})</span>
              </h4>
              <p className="text-xs text-zinc-400 mt-0.5">
                Референсный диапазон:{" "}
                {currentRefMin !== null ? currentRefMin : "—"} —{" "}
                {currentRefMax !== null ? currentRefMax : "—"} {currentUnit}
              </p>
            </div>

            {/* Latest Value Banner */}
            <div className="text-right">
              <span className="text-xs text-zinc-400 block">Последнее значение</span>
              <span className="text-2xl font-bold text-zinc-100">
                {filteredData[filteredData.length - 1].value}{" "}
                <span className="text-xs font-normal text-zinc-400">{currentUnit}</span>
              </span>
            </div>
          </div>

          {/* Interactive Chart */}
          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={filteredData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.6} />
                <XAxis dataKey="record_date" stroke="#71717a" fontSize={12} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={12} tickLine={false} domain={["auto", "auto"]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#18181b",
                    borderColor: "#3f3f46",
                    borderRadius: "0.75rem",
                    color: "#f4f4f5",
                    fontSize: "12px",
                  }}
                  formatter={(val: any) => [`${val} ${currentUnit}`, selectedMetric]}
                />
                {currentRefMin !== null && currentRefMin !== undefined && (
                  <ReferenceLine
                    y={currentRefMin}
                    stroke="#a1a1aa"
                    strokeDasharray="4 4"
                    label={{ value: `Мин: ${currentRefMin}`, fill: "#a1a1aa", fontSize: 10, position: "insideBottomLeft" }}
                  />
                )}
                {currentRefMax !== null && currentRefMax !== undefined && (
                  <ReferenceLine
                    y={currentRefMax}
                    stroke="#71717a"
                    strokeDasharray="4 4"
                    label={{ value: `Макс: ${currentRefMax}`, fill: "#71717a", fontSize: 10, position: "insideTopLeft" }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#e4e4e7"
                  strokeWidth={2.5}
                  dot={{ fill: "#e4e4e7", r: 4 }}
                  activeDot={{ r: 6, fill: "#ffffff" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* History Table */}
      {filteredData.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-zinc-800">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              История измерений ({selectedMetric})
            </h4>
          </div>
          <div className="divide-y divide-zinc-800">
            {filteredData.map((row) => (
              <div key={row.id} className="p-3.5 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-3">
                  <Calendar className="w-4 h-4 text-zinc-500" />
                  <span className="text-zinc-200 font-medium">{row.record_date}</span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="font-semibold text-zinc-100">
                    {row.value} {row.unit}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full font-medium border ${
                      row.status === "normal"
                        ? "bg-zinc-800 text-zinc-300 border-zinc-700"
                        : row.status === "high"
                        ? "bg-rose-950/30 text-rose-300 border-rose-900/40"
                        : "bg-amber-950/30 text-amber-300 border-amber-900/40"
                    }`}
                  >
                    {row.status === "normal" ? "Норма" : row.status === "high" ? "Повышен" : "Понижен"}
                  </span>
                  <button
                    onClick={() => handleDeleteMetric(row.id)}
                    className="text-zinc-500 hover:text-red-400 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Metric Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-100">Добавить показатель анализа</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddMetric} className="space-y-3">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Название биомаркера</label>
                <input
                  type="text"
                  value={newMetric.metric_name || ""}
                  onChange={(e) => setNewMetric({ ...newMetric, metric_name: e.target.value })}
                  placeholder="напр. Ферритин, Витамин D, Глюкоза..."
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:border-zinc-500 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Значение</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newMetric.value || ""}
                    onChange={(e) => setNewMetric({ ...newMetric, value: parseFloat(e.target.value) })}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:border-zinc-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Ед. измерения</label>
                  <input
                    type="text"
                    value={newMetric.unit || ""}
                    onChange={(e) => setNewMetric({ ...newMetric, unit: e.target.value })}
                    placeholder="мкг/л, нг/мл..."
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:border-zinc-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Референс Мин</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newMetric.reference_min || ""}
                    onChange={(e) => setNewMetric({ ...newMetric, reference_min: parseFloat(e.target.value) || undefined })}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:border-zinc-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Референс Макс</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newMetric.reference_max || ""}
                    onChange={(e) => setNewMetric({ ...newMetric, reference_max: parseFloat(e.target.value) || undefined })}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:border-zinc-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Дата взятия анализа</label>
                <input
                  type="date"
                  value={newMetric.record_date || ""}
                  onChange={(e) => setNewMetric({ ...newMetric, record_date: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:border-zinc-500 outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-xl text-xs hover:bg-zinc-750"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-zinc-100 hover:bg-white text-zinc-950 rounded-xl text-xs font-semibold transition"
                >
                  Добавить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
