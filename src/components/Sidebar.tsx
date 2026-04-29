"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const [isSgdOpen, setIsSgdOpen] = useState(true);
  const [isQpsOpen, setIsQpsOpen] = useState(true);
  const pathname = usePathname();

  const toggleSgd = () => setIsSgdOpen(!isSgdOpen);
  const toggleQps = () => setIsQpsOpen(!isQpsOpen);

  const isActive = (path: string) => pathname === path;

  return (
    <aside className="m-4 w-[23.5%] min-w-[250px] max-w-[700px] bg-[#2b3f64] text-white flex flex-col p-6 shadow-2xl rounded-3xl overflow-y-auto">
      <div className="mb-10 w-full shrink-0">
        <Link href="/" className="block w-full text-center">
          <Image
            src="/logo.webp"
            alt="Logo Sistema Calidad"
            width={200}
            height={60}
            className="w-[70%] max-w-[200px] h-auto object-contain cursor-pointer mx-auto"
            priority
          />
        </Link>
      </div>

      <nav className="flex-1 space-y-6">
        {/* Dashboard link */}
        <Link
          href="/"
          className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 font-semibold ${
            isActive("/") 
              ? "border border-white/30 shadow-2xl/20 inset-shadow-sm inset-shadow-white/30 backdrop-blur-md bg-white/5 text-white" 
              : "hover:scale-105 hover:bg-white/5 text-white/90"
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Dashboard
        </Link>

        {/* Sección SGD */}
        <div className="space-y-1">
          <div
            onClick={toggleSgd}
            className="flex items-center justify-between px-4 py-2 cursor-pointer group rounded-lg hover:bg-white/5 transition-colors"
          >
            <span className="text-xs font-bold uppercase tracking-wider text-white/60">Sistema de Gestión Documental (SGD)</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-4 w-4 text-white/80 opacity-0 group-hover:opacity-100 transition-all duration-200 ${isSgdOpen ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          {isSgdOpen && (
            <div className="space-y-1 ml-2">
              {[
                { name: "Emitir Documento", href: "#", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /> },
                { name: "Revisar Documento", href: "#", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /> },
                { name: "Aprobar Documento", href: "#", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /> },
                { name: "Firmar Documento", href: "#", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /> }
              ].map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all duration-300 text-sm font-medium ${
                    isActive(item.href) 
                      ? "border border-white/30 shadow-2xl/20 inset-shadow-sm inset-shadow-white/30 backdrop-blur-md bg-white/5 text-white scale-105" 
                      : "hover:scale-105 hover:bg-white/5 text-white/90"
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {item.icon}
                  </svg>
                  {item.name}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Sección QPS */}
        <div className="space-y-1">
          <div
            onClick={toggleQps}
            className="flex items-center justify-between px-4 py-2 cursor-pointer group rounded-lg hover:bg-white/5 transition-colors"
          >
            <span className="text-xs font-bold uppercase tracking-wider text-white/60">Calidad y Seguridad del Paciente (QPS)</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-4 w-4 text-white/80 opacity-0 group-hover:opacity-100 transition-all duration-200 ${isQpsOpen ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          {isQpsOpen && (
            <div className="space-y-1 ml-2">
              {[
                { name: "Categorización", href: "#", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /> },
                { name: "Acreditación Nacional", href: "/acreditacion", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /> },
                { name: "Auditoría de Procesos", href: "#", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /> }
              ].map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all duration-300 text-sm font-medium ${
                    isActive(item.href) 
                      ? "border border-white/30 shadow-2xl/20 inset-shadow-sm inset-shadow-white/30 backdrop-blur-md bg-white/5 text-white scale-105" 
                      : "hover:scale-105 hover:bg-white/5 text-white/90"
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {item.icon}
                  </svg>
                  {item.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </nav>

      <div className="mt-auto pt-8 border-t border-white/20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold shrink-0">
            U
          </div>
          <div className="overflow-hidden">
            <p className="font-medium text-sm truncate">Usuario</p>
            <p className="text-xs text-white/70 truncate">Admin</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
