"use client";

import React, { useState } from "react";
import { 
  User, 
  Heart, 
  AlertTriangle, 
  Pill, 
  Activity, 
  FileText, 
  Edit3, 
  Save, 
  X,
  Scale,
  Ruler
} from "lucide-react";
import { Patient, api } from "@/lib/api";

interface PatientCardProps {
  patient: Patient;
  onUpdate: (updated: Patient) => void;
}

export const PatientCard: React.FC<PatientCardProps> = ({ patient, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Patient>>({ ...patient });
  const [saving, setSaving] = useState(false);

  const getBmiBadge = (bmi?: number) => {
    if (!bmi) return null;
    let label = "Норма";
    let color = "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
    if (bmi < 18.5) {
      label = "Дефицит веса";
      color = "bg-amber-500/20 text-amber-300 border-amber-500/30";
    } else if (bmi >= 25 && bmi < 30) {
      label = "Избыточный вес";
      color = "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
    } else if (bmi >= 30) {
      label = "Ожирение";
      color = "bg-rose-500/20 text-rose-300 border-rose-500/30";
    }
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full border ${color}`}>
        {bmi} — {label}
      </span>
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api.updatePatient(patient.id, formData);
      onUpdate(updated);
      setIsEditing(false);
    } catch (err) {
      alert("Ошибка сохранения данных пациента: " + err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Profile Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-teal-500/20">
              <User className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                {patient.full_name}
                {getBmiBadge(patient.bmi)}
              </h2>
              <p className="text-sm text-slate-400 mt-1 flex items-center gap-3">
                <span>{patient.gender === "male" ? "Мужской" : patient.gender === "female" ? "Женский" : "Пол не указан"}</span>
                <span>•</span>
                <span>{patient.age ? `${patient.age} лет` : "Возраст не указан"}</span>
                <span>•</span>
                <span>Группа крови: {patient.blood_type || "Не указана"}</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-teal-300 rounded-xl text-sm font-medium flex items-center gap-2 border border-slate-700 transition"
          >
            {isEditing ? <X className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
            {isEditing ? "Отмена" : "Редактировать"}
          </button>
        </div>

        {/* Vital stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
              <Ruler className="w-3.5 h-3.5 text-teal-400" />
              Рост
            </div>
            <div className="text-base font-semibold text-white">
              {patient.height ? `${patient.height} см` : "—"}
            </div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
              <Scale className="w-3.5 h-3.5 text-teal-400" />
              Вес
            </div>
            <div className="text-base font-semibold text-white">
              {patient.weight ? `${patient.weight} кг` : "—"}
            </div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
              <Activity className="w-3.5 h-3.5 text-teal-400" />
              Индекс массы (ИМТ)
            </div>
            <div className="text-base font-semibold text-white">
              {patient.bmi ? patient.bmi : "—"}
            </div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
              <Heart className="w-3.5 h-3.5 text-rose-400" />
              Группа крови
            </div>
            <div className="text-base font-semibold text-white">
              {patient.blood_type || "—"}
            </div>
          </div>
        </div>
      </div>

      {/* Editing Form */}
      {isEditing && (
        <form onSubmit={handleSave} className="bg-slate-900 border border-teal-500/40 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-teal-400" />
            Редактирование данных пациента
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">ФИО</label>
              <input
                type="text"
                value={formData.full_name || ""}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-teal-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Возраст (лет)</label>
              <input
                type="number"
                value={formData.age || ""}
                onChange={(e) => setFormData({ ...formData, age: Number(e.target.value) || undefined })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-teal-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Пол</label>
              <select
                value={formData.gender || ""}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-teal-500 outline-none"
              >
                <option value="">Не указан</option>
                <option value="male">Мужской</option>
                <option value="female">Женский</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Рост (см)</label>
              <input
                type="number"
                value={formData.height || ""}
                onChange={(e) => setFormData({ ...formData, height: Number(e.target.value) || undefined })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-teal-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Вес (кг)</label>
              <input
                type="number"
                step="0.1"
                value={formData.weight || ""}
                onChange={(e) => setFormData({ ...formData, weight: Number(e.target.value) || undefined })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-teal-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Группа крови</label>
              <input
                type="text"
                placeholder="напр. A(II) Rh+"
                value={formData.blood_type || ""}
                onChange={(e) => setFormData({ ...formData, blood_type: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-teal-500 outline-none"
              />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <label className="text-xs font-semibold text-rose-300 mb-1 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Аллергии и непереносимости (учитываются ИИ в первую очередь)
              </label>
              <textarea
                rows={2}
                value={formData.allergies || ""}
                onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                placeholder="напр. Пенициллин, арахис, НПВС, пыльца березы..."
                className="w-full bg-slate-950 border border-rose-900/50 rounded-xl px-3 py-2 text-sm text-white focus:border-rose-500 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-teal-300 mb-1 flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5" />
                Хронические заболевания и диагнозы
              </label>
              <textarea
                rows={2}
                value={formData.chronic_diseases || ""}
                onChange={(e) => setFormData({ ...formData, chronic_diseases: e.target.value })}
                placeholder="напр. Артериальная гипертензия 1 ст, гипотиреоз, гастрит..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-teal-500 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-teal-300 mb-1 flex items-center gap-1.5">
                <Pill className="w-3.5 h-3.5" />
                Текущие лекарственные препараты и БАДы
              </label>
              <textarea
                rows={2}
                value={formData.current_medications || ""}
                onChange={(e) => setFormData({ ...formData, current_medications: e.target.value })}
                placeholder="напр. Эутирокс 50 мкг утром, Омега-3 1000мг, Витамин D 2000 МЕ..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-teal-500 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                Дополнительные примечания
              </label>
              <textarea
                rows={2}
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Особые пожелания, образ жизни, график сна..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-teal-500 outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm transition"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white font-medium rounded-xl text-sm flex items-center gap-2 shadow-lg shadow-teal-600/30 transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? "Сохранение..." : "Сохранить изменения"}
            </button>
          </div>
        </form>
      )}

      {/* Critical Medical Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Allergies Alert */}
        <div className="bg-rose-950/20 border border-rose-900/50 rounded-2xl p-5">
          <div className="flex items-center space-x-2 text-rose-400 font-semibold text-sm mb-2">
            <AlertTriangle className="w-4 h-4" />
            <span>Аллергии и непереносимости</span>
          </div>
          <p className="text-xs text-rose-200/90 whitespace-pre-wrap leading-relaxed">
            {patient.allergies || "Аллергии не зафиксированы"}
          </p>
        </div>

        {/* Chronic diseases */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center space-x-2 text-teal-400 font-semibold text-sm mb-2">
            <Heart className="w-4 h-4" />
            <span>Хронические диагнозы</span>
          </div>
          <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
            {patient.chronic_diseases || "Хронические заболевания не указаны"}
          </p>
        </div>

        {/* Medications */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center space-x-2 text-cyan-400 font-semibold text-sm mb-2">
            <Pill className="w-4 h-4" />
            <span>Текущая терапия / БАДы</span>
          </div>
          <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
            {patient.current_medications || "Препараты не принимаются"}
          </p>
        </div>
      </div>
    </div>
  );
};
