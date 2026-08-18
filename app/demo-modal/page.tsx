"use client";

import React, { useState } from "react";
import {
  Building2,
  Sparkles,
  ArrowRight,
  Check,
  Package,
  Tag,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";

export default function DemoModalPage() {
  const [paso, setPaso] = useState(1);
  const [nombreEmpresa, setNombreEmpresa] = useState("");

  // Lista de categorías disponibles y seleccionadas
  const [categorias, setCategorias] = useState<string[]>([
    "Bebidas",
    "Alimentos",
    "Golosinas",
    "Limpieza",
    "Fiambres & Lácteos",
    "Panadería",
  ]);
  const [categoriasSeleccionadas, setCategoriasSeleccionadas] = useState<
    string[]
  >(["Bebidas", "Alimentos", "Golosinas"]);
  const [nuevaCategoria, setNuevaCategoria] = useState("");

  // Productos de ejemplo (8 productos)
  const [ejemplosCargados, setEjemplosCargados] = useState(false);
  const productosEjemplo = [
    { nombre: "Coca Cola 500ml", cat: "Bebidas", precio: "$1.500" },
    { nombre: "Sprite 500ml", cat: "Bebidas", precio: "$1.500" },
    { nombre: "Fanta 500ml", cat: "Bebidas", precio: "$1.500" },
    { nombre: "Galletitas Oreo", cat: "Alimentos", precio: "$2.500" },
    { nombre: "Arroz 1kg", cat: "Alimentos", precio: "$1.800" },
    { nombre: "Azúcar 1kg", cat: "Alimentos", precio: "$1.200" },
    { nombre: "Yerba Mate 500g", cat: "Alimentos", precio: "$3.200" },
    { nombre: "Aceite de Girasol 1L", cat: "Alimentos", precio: "$2.800" },
  ];

  // Alternar selección de categoría
  const toggleCategoria = (cat: string) => {
    if (categoriasSeleccionadas.includes(cat)) {
      setCategoriasSeleccionadas(
        categoriasSeleccionadas.filter((c) => c !== cat),
      );
    } else {
      setCategoriasSeleccionadas([...categoriasSeleccionadas, cat]);
    }
  };

  // Agregar categoría propia
  const handleAgregarCategoria = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaCategoria.trim()) return;
    const catLimpia = nuevaCategoria.trim();
    if (!categorias.includes(catLimpia)) {
      setCategorias([...categorias, catLimpia]);
    }
    if (!categoriasSeleccionadas.includes(catLimpia)) {
      setCategoriasSeleccionadas([...categoriasSeleccionadas, catLimpia]);
    }
    setNuevaCategoria("");
  };

  const reiniciarDemo = () => {
    setPaso(1);
    setNombreEmpresa("");
    setCategoriasSeleccionadas(["Bebidas", "Alimentos", "Golosinas"]);
    setEjemplosCargados(false);
  };

  return (
    <div className="min-h-screen bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center p-4 relative font-sans">
      {/* Indicador superior */}
      <div className="absolute top-6 left-6 bg-slate-800 border border-slate-700 text-slate-300 text-xs px-4 py-2 rounded-full flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
        Vista previa de Onboarding • StockLine
      </div>

      {/* MODAL PRINCIPAL */}
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-6 sm:p-8 border border-slate-100 relative overflow-hidden transition-all">
        {/* Cabecera del Modal */}
        <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-tr from-blue-600 to-blue-500 rounded-xl flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
              S
            </div>
            <div>
              <h1 className="font-bold text-slate-800 text-base leading-none">
                StockLine
              </h1>
              <span className="text-[11px] text-slate-400 font-medium">
                Configuración inicial
              </span>
            </div>
          </div>
          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
            Paso {paso} de 4
          </span>
        </div>

        {/* Stepper Horizontal */}
        <div className="flex items-center justify-between mb-8 px-2 relative">
          {["Empresa", "Categorías", "Productos", "Finalizar"].map(
            (label, idx) => {
              const num = idx + 1;
              const isDone = paso > num;
              const isCurrent = paso === num;

              return (
                <div
                  key={label}
                  className="flex flex-col items-center gap-1.5 z-10"
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                      isDone
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/30"
                        : isCurrent
                          ? "bg-blue-600 text-white ring-4 ring-blue-100 scale-105"
                          : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {isDone ? <Check className="w-4 h-4 stroke-[3]" /> : num}
                  </div>
                  <span
                    className={`text-[11px] font-medium hidden sm:block ${isCurrent ? "text-slate-900 font-semibold" : "text-slate-400"}`}
                  >
                    {label}
                  </span>
                </div>
              );
            },
          )}
          {/* Línea conectora */}
          <div className="absolute top-4 left-6 right-6 h-[2px] bg-slate-100 -z-0" />
        </div>

        {/* ================= PASO 1: NOMBRE DE LA EMPRESA ================= */}
        {paso === 1 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-slate-900">
                ¡Bienvenido a StockLine! 👋
              </h2>
              <p className="text-slate-500 text-sm">
                Para comenzar a personalizar tu espacio, ingresá el nombre de tu
                comercio.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Nombre de tu Empresa o Comercio
              </label>
              <div className="relative">
                <Building2 className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={nombreEmpresa}
                  onChange={(e) => setNombreEmpresa(e.target.value)}
                  placeholder="Ej. Kiosco Central, Minimarket San José..."
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <button
              disabled={!nombreEmpresa.trim()}
              onClick={() => setPaso(2)}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 transition-all cursor-pointer"
            >
              <span>Continuar</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ================= PASO 2: CATEGORÍAS ================= */}
        {paso === 2 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center space-y-1.5">
              <h2 className="text-2xl font-bold text-slate-900">
                Elegí tus categorías
              </h2>
              <p className="text-slate-500 text-sm">
                Seleccioná las categorías con las que trabajás o agregá las
                tuyas propias.
              </p>
            </div>

            {/* Grid de selección de categorías */}
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 max-h-44 overflow-y-auto pr-1">
                {categorias.map((cat) => {
                  const isSelected = categoriasSeleccionadas.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategoria(cat)}
                      className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500/20"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <Tag
                        className={`w-3.5 h-3.5 ${isSelected ? "text-blue-600" : "text-slate-400"}`}
                      />
                      <span>{cat}</span>
                      {isSelected ? (
                        <Check className="w-3.5 h-3.5 text-blue-600 stroke-[3] ml-1" />
                      ) : (
                        <Plus className="w-3.5 h-3.5 text-slate-400 ml-1" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Input para agregar categoría manual */}
              <form
                onSubmit={handleAgregarCategoria}
                className="flex gap-2 pt-1"
              >
                <input
                  type="text"
                  value={nuevaCategoria}
                  onChange={(e) => setNuevaCategoria(e.target.value)}
                  placeholder="Agregar nueva categoría personalizada..."
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-600"
                />
                <button
                  type="submit"
                  disabled={!nuevaCategoria.trim()}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-40 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Agregar</span>
                </button>
              </form>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setPaso(1)}
                className="w-1/3 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-2xl transition-all"
              >
                Volver
              </button>
              <button
                disabled={categoriasSeleccionadas.length === 0}
                onClick={() => setPaso(3)}
                className="w-2/3 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 transition-all"
              >
                <span>Siguiente ({categoriasSeleccionadas.length})</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================= PASO 3: PRODUCTOS ================= */}
        {paso === 3 && (
          <div className="space-y-5 animate-fadeIn">
            <div className="text-center space-y-1.5">
              <h2 className="text-2xl font-bold text-slate-900">
                Cargá tus productos
              </h2>
              <p className="text-slate-500 text-sm">
                Podés cargar productos de ejemplo para probar el sistema o
                agregar los tuyos.
              </p>
            </div>

            {/* Opciones de carga */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 text-left transition-all group"
              >
                <Plus className="w-5 h-5 text-slate-500 mb-1.5 group-hover:scale-110 transition-transform" />
                <div className="text-sm font-semibold text-slate-800">
                  Agregar manual
                </div>
                <div className="text-[11px] text-slate-400">
                  Crear uno a uno
                </div>
              </button>

              <button
                type="button"
                onClick={() => setEjemplosCargados(true)}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  ejemplosCargados
                    ? "border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20"
                    : "border-slate-200 bg-white hover:border-blue-300"
                }`}
              >
                <Sparkles className="w-5 h-5 text-blue-600 mb-1.5" />
                <div className="text-sm font-semibold text-slate-800">
                  Cargar ejemplos
                </div>
                <div className="text-[11px] text-blue-600 font-semibold">
                  8 productos listos ✨
                </div>
              </button>
            </div>

            {/* Vista previa de los 8 productos ejemplo */}
            {ejemplosCargados && (
              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 space-y-2 animate-fadeIn">
                <div className="flex justify-between items-center text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  <span>8 Productos de ejemplo listos</span>
                  <button
                    onClick={() => setEjemplosCargados(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {productosEjemplo.map((prod, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center bg-white px-3 py-2 rounded-xl border border-slate-100 text-xs"
                    >
                      <span className="font-semibold text-slate-800">
                        {prod.nombre}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium text-[11px]">
                          {prod.cat}
                        </span>
                        <span className="font-bold text-slate-900">
                          {prod.precio}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setPaso(2)}
                className="w-1/3 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-2xl transition-all"
              >
                Volver
              </button>
              <button
                onClick={() => setPaso(4)}
                className="w-2/3 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 transition-all"
              >
                <span>Finalizar</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================= PASO 4: FINALIZAR (CONFIGURACIÓN COMPLETA) ================= */}
        {paso === 4 && (
          <div className="space-y-6 text-center animate-fadeIn py-2">
            {/* Ícono animado de éxito */}
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping" />
              <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-emerald-500 rounded-full flex items-center justify-center text-white shadow-xl shadow-blue-500/30 relative z-10 scale-105 transition-transform duration-500">
                <Check className="w-10 h-10 stroke-[3]" />
              </div>
            </div>

            <div className="space-y-1.5">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                ¡{nombreEmpresa || "Tu negocio"} está listo!
              </h2>
              <p className="text-slate-500 text-sm max-w-sm mx-auto">
                Tu tienda fue configurada correctamente. Podés empezar a vender
                ahora o agregar más productos después.
              </p>
            </div>

            {/* Tarjetas resumen */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col items-center justify-center">
                <Tag className="w-5 h-5 text-blue-600 mb-1" />
                <span className="text-xl font-bold text-slate-900">
                  {categoriasSeleccionadas.length}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  Categorías elegidas
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 flex flex-col items-center justify-center">
                <Package className="w-5 h-5 text-emerald-600 mb-1" />
                <span className="text-xl font-bold text-slate-900">
                  {ejemplosCargados ? "8" : "0"}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  Productos cargados
                </span>
              </div>
            </div>

            {/* Botones de acción final */}
            <div className="space-y-3 pt-2">
              <button
                onClick={() =>
                  alert("Navegando al panel principal de StockLine...")
                }
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-blue-600/30 transition-all cursor-pointer hover:scale-[1.01]"
              >
                <span>Ir al panel</span>
                <ArrowRight className="w-5 h-5" />
              </button>

              <button
                onClick={reiniciarDemo}
                className="text-xs font-semibold text-slate-400 hover:text-slate-600 flex items-center justify-center gap-1 mx-auto pt-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reiniciar simulación de prueba
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
