"use client";

import React, { useState } from "react";
import {
  Stethoscope,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Sun,
  Moon,
  ArrowRight,
  ArrowLeft,
  KeyRound
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";
import { api } from "@/lib/api";

export const AuthView: React.FC = () => {
  const { login, register } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const { language, setLanguage } = useLanguage();

  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [forgotStep, setForgotStep] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isRu = language === "ru";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setError(isRu ? "Введите корректный адрес электронной почты" : "Please enter a valid email address");
      return;
    }

    if (mode === "forgot") {
      if (forgotStep === "request") {
        setSubmitting(true);
        try {
          const res = await api.forgotPassword(trimmedEmail);
          setSuccessMsg(
            res.message ||
              (isRu
                ? "Код восстановления отправлен на вашу почту."
                : "A 6-digit recovery code has been sent to your email.")
          );
          setForgotStep("reset");
        } catch (err: any) {
          setError(err?.message || (isRu ? "Не удалось отправить код" : "Failed to send recovery code"));
        } finally {
          setSubmitting(false);
        }
        return;
      }

      // Step 2: verify code & set new password
      if (resetCode.trim().length < 4) {
        setError(isRu ? "Введите 6-значный код из письма" : "Enter the 6-digit code from your email");
        return;
      }
      if (password.length < 6) {
        setError(isRu ? "Новый пароль должен содержать минимум 6 символов" : "New password must be at least 6 characters");
        return;
      }
      if (password !== confirmPassword) {
        setError(isRu ? "Пароли не совпадают" : "Passwords do not match");
        return;
      }

      setSubmitting(true);
      try {
        const res = await api.resetPassword({
          email: trimmedEmail,
          code: resetCode.trim(),
          new_password: password,
        });
        setMode("login");
        setForgotStep("request");
        setPassword("");
        setConfirmPassword("");
        setResetCode("");
        setSuccessMsg(
          res.message ||
            (isRu ? "Пароль успешно изменён! Войдите с новым паролем." : "Password updated! You can now sign in.")
        );
      } catch (err: any) {
        setError(err?.message || (isRu ? "Неверный или истёкший код" : "Invalid or expired code"));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (password.length < 6) {
      setError(isRu ? "Пароль должен содержать минимум 6 символов" : "Password must be at least 6 characters");
      return;
    }
    if (mode === "register" && password !== confirmPassword) {
      setError(isRu ? "Пароли не совпадают" : "Passwords do not match");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(trimmedEmail, password);
      } else {
        await register(trimmedEmail, password, fullName.trim() || undefined);
      }
    } catch (err: any) {
      setError(err?.message || (isRu ? "Ошибка авторизации" : "Authentication failed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors duration-200">
      {/* Top Bar */}
      <header className="w-full px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 flex items-center justify-center shadow-xs">
            <Stethoscope className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />
          </div>
          <div>
            <span className="font-bold text-base tracking-wide text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              MY_DOC
              <span className="text-[10px] bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700 px-1.5 py-0.5 rounded font-mono font-medium">
                AI MED
              </span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            title={resolvedTheme === "dark" ? (isRu ? "Светлая тема" : "Light theme") : (isRu ? "Тёмная тема" : "Dark theme")}
            className="p-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-xl transition"
          >
            {resolvedTheme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-700" />}
          </button>

          <div className="flex items-center bg-zinc-200/80 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-xl p-0.5">
            <button
              type="button"
              onClick={() => setLanguage("ru")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                isRu
                  ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-100 shadow-xs"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              RU
            </button>
            <button
              type="button"
              onClick={() => setLanguage("en")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                !isRu
                  ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-100 shadow-xs"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              EN
            </button>
          </div>
        </div>
      </header>

      {/* Center Auth Card */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-zinc-900/95 border border-zinc-300 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden">
          {/* Card Header */}
          <div className="px-7 pt-7 pb-5 text-center border-b border-zinc-200 dark:border-zinc-800/80">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 flex items-center justify-center mx-auto mb-3.5 shadow-sm">
              {mode === "forgot" ? <KeyRound className="w-6 h-6" /> : <Stethoscope className="w-6 h-6" />}
            </div>
            <h1 className="text-xl font-bold text-zinc-950 dark:text-zinc-50">
              {mode === "login"
                ? isRu ? "Вход в MY_DOC" : "Sign in to MY_DOC"
                : mode === "register"
                ? isRu ? "Создание аккаунта" : "Create your account"
                : isRu ? "Восстановление пароля" : "Reset your password"}
            </h1>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1.5">
              {mode === "login"
                ? isRu ? "Войдите для доступа к вашим пациентам и анализам" : "Sign in to access your patients and medical records"
                : mode === "register"
                ? isRu ? "Персональный защищённый медицинский кабинет" : "Your private, isolated medical workspace"
                : forgotStep === "request"
                ? isRu ? "Введите ваш email — мы отправим 6-значный код" : "Enter your email to receive a 6-digit recovery code"
                : isRu ? "Введите код из письма и задайте новый пароль" : "Enter the code from your email and choose a new password"}
            </p>

            {/* Mode Switcher Tabs (hidden in forgot mode) */}
            {mode !== "forgot" && (
              <div className="mt-5 grid grid-cols-2 p-1 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className={`py-2 text-xs font-semibold rounded-lg transition ${
                    mode === "login"
                      ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 shadow-xs border border-zinc-200/80 dark:border-zinc-700"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                  }`}
                >
                  {isRu ? "Вход" : "Sign In"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("register");
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className={`py-2 text-xs font-semibold rounded-lg transition ${
                    mode === "register"
                      ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 shadow-xs border border-zinc-200/80 dark:border-zinc-700"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                  }`}
                >
                  {isRu ? "Регистрация" : "Create Account"}
                </button>
              </div>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-7 space-y-4">
            {error && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/70 text-rose-700 dark:text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/70 text-emerald-700 dark:text-emerald-300 text-xs">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {mode === "register" && (
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  {isRu ? "Имя / ФИО (необязательно)" : "Full Name (optional)"}
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={isRu ? "Др. Иван Иванов" : "Dr. Jane Doe"}
                    autoComplete="name"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-zinc-100/20 focus:border-zinc-600 dark:focus:border-zinc-400 transition"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={mode === "forgot" && forgotStep === "reset"}
                  placeholder="name@example.com"
                  autoComplete="email"
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-zinc-100/20 focus:border-zinc-600 dark:focus:border-zinc-400 transition disabled:opacity-60"
                />
              </div>
            </div>

            {mode === "forgot" && forgotStep === "reset" && (
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  {isRu ? "Код из письма (6 цифр)" : "6-digit code from email"}
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    inputMode="numeric"
                    maxLength={8}
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    placeholder="123456"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm font-mono tracking-widest bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-zinc-100/20 focus:border-zinc-600 dark:focus:border-zinc-400 transition"
                  />
                </div>
              </div>
            )}

            {(mode !== "forgot" || forgotStep === "reset") && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    {mode === "forgot"
                      ? isRu ? "Новый пароль" : "New Password"
                      : isRu ? "Пароль" : "Password"}
                  </label>
                  {mode === "login" && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode("forgot");
                        setForgotStep("request");
                        setError(null);
                        setSuccessMsg(null);
                        setPassword("");
                      }}
                      className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100 underline-offset-2 hover:underline transition"
                    >
                      {isRu ? "Забыли пароль?" : "Forgot password?"}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={isRu ? "Минимум 6 символов" : "At least 6 characters"}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    className="w-full pl-10 pr-10 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-zinc-100/20 focus:border-zinc-600 dark:focus:border-zinc-400 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {(mode === "register" || (mode === "forgot" && forgotStep === "reset")) && (
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  {isRu ? "Подтвердите пароль" : "Confirm Password"}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={isRu ? "Повторите пароль" : "Repeat password"}
                    autoComplete="new-password"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-zinc-100/20 focus:border-zinc-600 dark:focus:border-zinc-400 transition"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-950 font-semibold text-sm rounded-xl shadow-sm flex items-center justify-center gap-2 transition disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>
                    {mode === "login"
                      ? isRu ? "Войти в систему" : "Sign In"
                      : mode === "register"
                      ? isRu ? "Создать аккаунт" : "Create Account"
                      : forgotStep === "request"
                      ? isRu ? "Отправить код на email" : "Send recovery code"
                      : isRu ? "Сохранить новый пароль" : "Save new password"}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {mode === "forgot" && (
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setForgotStep("request");
                  setError(null);
                  setSuccessMsg(null);
                  setPassword("");
                  setConfirmPassword("");
                  setResetCode("");
                }}
                className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 flex items-center justify-center gap-1.5 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{isRu ? "Вернуться ко входу" : "Back to Sign In"}</span>
              </button>
            )}

            <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800/80 flex items-center justify-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>
                {isRu
                  ? "Все данные пациентов и API-ключи изолированы внутри вашего аккаунта"
                  : "All patient records and API keys are strictly isolated to your account"}
              </span>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};
