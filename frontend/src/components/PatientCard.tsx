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
  Ruler,
  Trash2
} from "lucide-react";
import { Patient, api } from "@/lib/api";
import { useLanguage } from "@/context/LanguageContext";

interface PatientCardProps {
  patient: Patient;
  onUpdate: (updated: Patient) => void;
  onDelete?: (patientId: number) => void;
}

export const PatientCard: React.FC<PatientCardProps> = ({ patient, onUpdate, onDelete }) => {
  const { language, t } = useLanguage();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Patient>>({ ...patient });
  const [saving, setSaving] = useState(false);

  const getBmiBadge = (bmi?: number) => {
    if (!bmi) return null;
    let label = t.patientCard.bmiNormal;
    let color = "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700";
    if (bmi < 18.5) {
      label = t.patientCard.bmiUnder;
      color = "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/40";
    } else if (bmi >= 25 && bmi < 30) {
      label = t.patientCard.bmiOver;
      color = "bg-orange-50 text-orange-800 border-orange-200 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700";
    } else if (bmi >= 30) {
      label = t.patientCard.bmiObese;
      color = "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900/40";
    }
    return (
      <span className={`text-xs px-2.5 py-0.5 rounded-full border ${color}`}>
        {t.patientCard.bmi} {bmi} ({label})
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
      alert("Error saving patient data: " + err);
    } finally {
      setSaving(false);
    }
  };

  const genderLabel = patient.gender === "male" 
    ? t.common.male 
    : patient.gender === "female" 
    ? t.common.female 
    : t.patientCard.noData;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Profile Banner */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm dark:shadow-xl relative overflow-hidden transition-colors">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-700 dark:text-zinc-200 shadow-sm">
              <User className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
                {patient.full_name}
                {getBmiBadge(patient.bmi)}
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-3">
                <span>{genderLabel}</span>
                <span>•</span>
                <span>{patient.age ? `${patient.age} ${t.common.yearsOld}` : t.patientCard.noData}</span>
                <span>•</span>
                <span>{t.patientCard.bloodType}: {patient.blood_type || t.patientCard.noData}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onDelete && (
              <button
                onClick={() => onDelete(patient.id)}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-400 rounded-xl text-sm font-medium flex items-center gap-1.5 border border-rose-200 dark:border-rose-900/50 transition shadow-sm"
                title={t.patientCard.deletePatient}
              >
                <Trash2 className="w-4 h-4" />
                <span>{t.common.delete}</span>
              </button>
            )}

            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-200 rounded-xl text-sm font-medium flex items-center gap-2 border border-zinc-200 dark:border-zinc-700 transition"
            >
              {isEditing ? <X className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
              {isEditing ? t.common.cancel : t.common.edit}
            </button>
          </div>
        </div>

        {/* Vital stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-800">
          <div className="bg-zinc-50 dark:bg-zinc-950/70 p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80">
            <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 mb-1">
              <Ruler className="w-3.5 h-3.5 text-zinc-400" />
              {t.patientCard.height}
            </div>
            <div className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              {patient.height ? `${patient.height} ${t.common.cm}` : "—"}
            </div>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-950/70 p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80">
            <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 mb-1">
              <Scale className="w-3.5 h-3.5 text-zinc-400" />
              {t.patientCard.weight}
            </div>
            <div className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              {patient.weight ? `${patient.weight} ${t.common.kg}` : "—"}
            </div>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-950/70 p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80">
            <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 mb-1">
              <Activity className="w-3.5 h-3.5 text-zinc-400" />
              {t.patientCard.bmi}
            </div>
            <div className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              {patient.bmi ? patient.bmi : "—"}
            </div>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-950/70 p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80">
            <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 mb-1">
              <Heart className="w-3.5 h-3.5 text-zinc-400" />
              {t.patientCard.bloodType}
            </div>
            <div className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              {patient.blood_type || "—"}
            </div>
          </div>
        </div>
      </div>

      {/* Editing Form */}
      {isEditing && (
        <form onSubmit={handleSave} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-6 shadow-lg space-y-4 transition-colors">
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-2 flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            {t.patientCard.editProfile}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-zinc-600 dark:text-zinc-400 mb-1 block">{t.modals.fullNameLabel}</label>
              <input
                type="text"
                value={formData.full_name || ""}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-zinc-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="text-xs text-zinc-600 dark:text-zinc-400 mb-1 block">
                {language === "ru" ? "Возраст (лет)" : "Age (years)"}
              </label>
              <input
                type="number"
                value={formData.age || ""}
                onChange={(e) => setFormData({ ...formData, age: Number(e.target.value) || undefined })}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-zinc-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-600 dark:text-zinc-400 mb-1 block">{t.modals.genderLabel}</label>
              <select
                value={formData.gender || ""}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-zinc-500 outline-none"
              >
                <option value="">{t.patientCard.noData}</option>
                <option value="male">{t.common.male}</option>
                <option value="female">{t.common.female}</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-600 dark:text-zinc-400 mb-1 block">
                {t.patientCard.height} ({t.common.cm})
              </label>
              <input
                type="number"
                value={formData.height || ""}
                onChange={(e) => setFormData({ ...formData, height: Number(e.target.value) || undefined })}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-zinc-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-600 dark:text-zinc-400 mb-1 block">
                {t.patientCard.weight} ({t.common.kg})
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.weight || ""}
                onChange={(e) => setFormData({ ...formData, weight: Number(e.target.value) || undefined })}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-zinc-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-600 dark:text-zinc-400 mb-1 block">{t.patientCard.bloodType}</label>
              <input
                type="text"
                placeholder={language === "ru" ? "напр. A(II) Rh+" : "e.g. A+ / O-"}
                value={formData.blood_type || ""}
                onChange={(e) => setFormData({ ...formData, blood_type: e.target.value })}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-zinc-500 outline-none"
              />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <label className="text-xs font-semibold text-rose-600 dark:text-rose-300 mb-1 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                {t.patientCard.allergies}
              </label>
              <textarea
                rows={2}
                value={formData.allergies || ""}
                onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                placeholder={language === "ru" ? "напр. Пенициллин, арахис, НПВС, пыльца березы..." : "e.g. Penicillin, NSAIDs, tree nuts..."}
                className="w-full bg-rose-50/40 dark:bg-zinc-950 border border-rose-300 dark:border-rose-900/50 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-rose-500 outline-none placeholder:text-zinc-400"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5" />
                {t.patientCard.chronicConditions}
              </label>
              <textarea
                rows={2}
                value={formData.chronic_diseases || ""}
                onChange={(e) => setFormData({ ...formData, chronic_diseases: e.target.value })}
                placeholder={language === "ru" ? "напр. Артериальная гипертензия 1 ст, гипотиреоз, гастрит..." : "e.g. Hypertension, hypothyroidism, type 2 diabetes..."}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-zinc-500 outline-none placeholder:text-zinc-400"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-1.5">
                <Pill className="w-3.5 h-3.5" />
                {language === "ru" ? "Текущие лекарственные препараты и БАДы" : "Current Medications & Supplements"}
              </label>
              <textarea
                rows={2}
                value={formData.current_medications || ""}
                onChange={(e) => setFormData({ ...formData, current_medications: e.target.value })}
                placeholder={language === "ru" ? "напр. Эутирокс 50 мкг утром, Омега-3 1000мг, Витамин D 2000 МЕ..." : "e.g. Levothyroxine 50mcg, Omega-3 1000mg..."}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-zinc-500 outline-none placeholder:text-zinc-400"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                {t.patientCard.notes}
              </label>
              <textarea
                rows={2}
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={language === "ru" ? "Особые пожелания, образ жизни, график сна..." : "Lifestyle, sleep schedule, dietary notes..."}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-zinc-500 outline-none placeholder:text-zinc-400"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-sm transition"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-950 font-medium rounded-xl text-sm flex items-center gap-2 shadow-md transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? t.common.saving : t.common.save}
            </button>
          </div>
        </form>
      )}

      {/* Critical Medical Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Allergies Alert */}
        <div className="bg-white dark:bg-zinc-900 border border-rose-200 dark:border-rose-950/60 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center space-x-2 text-rose-600 dark:text-rose-400 font-semibold text-sm mb-2">
            <AlertTriangle className="w-4 h-4" />
            <span>{t.patientCard.allergies}</span>
          </div>
          <p className="text-xs text-zinc-800 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
            {patient.allergies || (language === "ru" ? "Аллергии не зафиксированы" : "No known allergies")}
          </p>
        </div>

        {/* Chronic diseases */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center space-x-2 text-zinc-800 dark:text-zinc-300 font-semibold text-sm mb-2">
            <Heart className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            <span>{t.patientCard.chronicConditions}</span>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap leading-relaxed">
            {patient.chronic_diseases || (language === "ru" ? "Хронические заболевания не указаны" : "No chronic conditions listed")}
          </p>
        </div>

        {/* Medications */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center space-x-2 text-zinc-800 dark:text-zinc-300 font-semibold text-sm mb-2">
            <Pill className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            <span>{language === "ru" ? "Текущая терапия / БАДы" : "Current Medications / Supplements"}</span>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap leading-relaxed">
            {patient.current_medications || (language === "ru" ? "Препараты не принимаются" : "No medications listed")}
          </p>
        </div>
      </div>
    </div>
  );
};
