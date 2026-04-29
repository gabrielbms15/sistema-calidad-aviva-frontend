import React from "react";

export default function Home() {
  return (
    <div className="flex flex-col h-full">
      <header className="mb-10">
        <h1 className="text-4xl font-extrabold text-gray-800 drop-shadow-sm">Dashboard</h1>
        <p className="text-gray-600 mt-2 text-lg">Bienvenido al sistema de calidad.</p>
      </header>
      
      <div className="flex-1 rounded-3xl bg-white shadow-xl p-8 border border-gray-100 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-[#3d537e]/10 text-[#3d537e] rounded-full flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">Área de Trabajo</h2>
          <p className="text-gray-500">
            Selecciona una opción del menú para comenzar a trabajar en el sistema.
          </p>
        </div>
      </div>
    </div>
  );
}
