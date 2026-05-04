"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import "overlayscrollbars/overlayscrollbars.css";

const SGD_ITEMS = [
  { name: "Emitir Documento", href: "#", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /> },
  { name: "Revisar Documento", href: "#", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /> },
  { name: "Aprobar Documento", href: "#", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /> },
  { name: "Firmar Documento", href: "#", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /> }
];

const QPS_ITEMS = [
  { name: "Categorización", href: "#", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /> },
  { name: "Acreditación Nacional", href: "/acreditacion", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /> },
  { name: "Auditoría de Procesos", href: "#", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /> }
];

export default function Sidebar() {
  const [isSgdOpen, setIsSgdOpen] = useState(true);
  const [isQpsOpen, setIsQpsOpen] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const pathname = usePathname();

  const toggleSgd = () => setIsSgdOpen(!isSgdOpen);
  const toggleQps = () => setIsQpsOpen(!isQpsOpen);

  const isActive = (path: string) => pathname === path;

  const filteredSgd = SGD_ITEMS.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredQps = QPS_ITEMS.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const showSgd = searchQuery ? filteredSgd.length > 0 : isSgdOpen;
  const showQps = searchQuery ? filteredQps.length > 0 : isQpsOpen;

  return (
    <OverlayScrollbarsComponent
      element="aside"
      options={{ scrollbars: { autoHide: "scroll", theme: "os-theme-light" } }}
      defer
      className={`m-4 transition-all duration-300 ease-in-out bg-[#2b3f64] text-white flex flex-col p-6 shadow-2xl rounded-3xl relative ${
        isCollapsed ? "w-[100px] min-w-[100px] items-center px-4" : "w-[23.5%] min-w-[250px] max-w-[700px]"
      }`}
    >
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute top-6 right-4 p-1 text-white/40 hover:text-white/80 transition-colors z-10"
        title={isCollapsed ? "Expandir" : "Retraer"}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          {isCollapsed ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          )}
        </svg>
      </button>
      <div className={`mb-6 w-full shrink-0 flex items-center ${isCollapsed ? "justify-center" : ""}`}>
        <Link href="/" className="block w-full text-center">
          {isCollapsed ? (
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center font-bold text-xl mx-auto">
              A
            </div>
          ) : (
            <Image
              src="/logo.webp"
              alt="Logo Sistema Calidad"
              width={200}
              height={60}
              className="w-[70%] max-w-[240px] h-auto object-contain cursor-pointer mx-auto relative -left-[16px]"
              priority
            />
          )}
        </Link>
      </div>

      {/* Buscador estilo macOS */}
      {!isCollapsed && (
        <div className="mb-6 relative group px-1 shrink-0">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg className="h-4 w-4 text-white/50 group-focus-within:text-white/80 transition-colors" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Buscar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/20 text-white placeholder-white/40 text-sm rounded-[10px] pl-10 pr-10 py-2 border border-white/10 focus:border-white/20 focus:bg-black/30 focus:outline-none focus:ring-4 focus:ring-white/5 transition-all shadow-inner"
          />
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
            <span className="text-[10px] text-white/40 font-medium px-1.5 py-0.5 border border-white/10 rounded bg-white/5">⌘K</span>
          </div>
        </div>
      )}

      <nav className="flex-1 space-y-6">
        {/* Dashboard link */}
        <Link
          href="/"
          className={`flex items-center gap-3 py-3 rounded-2xl transition-all duration-300 font-semibold ${isCollapsed ? 'justify-center px-0' : 'px-4'} ${
            isActive("/")
              ? "border border-white/30 shadow-2xl/20 inset-shadow-sm inset-shadow-white/30 backdrop-blur-md bg-white/5 text-white"
              : "hover:scale-105 hover:bg-white/5 text-white/90"
          }`}
          title={isCollapsed ? "Dashboard" : undefined}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          {!isCollapsed && "Dashboard"}
        </Link>

        {/* Sección SGD */}
        {(!searchQuery || filteredSgd.length > 0) && (
          <div className="space-y-1">
            {isCollapsed ? (
              <hr className="border-white/20 my-4 w-full" />
            ) : (
              <div
                onClick={toggleSgd}
                className="flex items-center justify-between px-4 py-2 cursor-pointer group rounded-lg hover:bg-white/5 transition-colors"
              >
                <span className="text-xs font-bold uppercase tracking-wider text-white/60">Sistema de Gestión Documental (SGD)</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-4 w-4 text-white/80 opacity-0 group-hover:opacity-100 transition-all duration-200 ${showSgd ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            )}

            {(showSgd || isCollapsed) && (
              <div className={`space-y-1 ${isCollapsed ? 'ml-0' : 'ml-2'}`}>
                {filteredSgd.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-3 py-2.5 rounded-2xl transition-all duration-300 font-medium ${isCollapsed ? 'justify-center px-0' : 'px-4 text-sm'} ${
                      isActive(item.href)
                        ? "border border-white/30 shadow-2xl/20 inset-shadow-sm inset-shadow-white/30 backdrop-blur-md bg-white/5 text-white scale-105"
                        : "hover:scale-105 hover:bg-white/5 text-white/90"
                    }`}
                    title={isCollapsed ? item.name : undefined}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-70 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      {item.icon}
                    </svg>
                    {!isCollapsed && item.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sección QPS */}
        {(!searchQuery || filteredQps.length > 0) && (
          <div className="space-y-1">
            {isCollapsed ? (
              <hr className="border-white/20 my-4 w-full" />
            ) : (
              <div
                onClick={toggleQps}
                className="flex items-center justify-between px-4 py-2 cursor-pointer group rounded-lg hover:bg-white/5 transition-colors"
              >
                <span className="text-xs font-bold uppercase tracking-wider text-white/60">Calidad y Seguridad del Paciente (QPS)</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-4 w-4 text-white/80 opacity-0 group-hover:opacity-100 transition-all duration-200 ${showQps ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            )}

            {(showQps || isCollapsed) && (
              <div className={`space-y-1 ${isCollapsed ? 'ml-0' : 'ml-2'}`}>
                {filteredQps.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-3 py-2.5 rounded-2xl transition-all duration-300 font-medium ${isCollapsed ? 'justify-center px-0' : 'px-4 text-sm'} ${
                      isActive(item.href)
                        ? "border border-white/30 shadow-2xl/20 inset-shadow-sm inset-shadow-white/30 backdrop-blur-md bg-white/5 text-white scale-105"
                        : "hover:scale-105 hover:bg-white/5 text-white/90"
                    }`}
                    title={isCollapsed ? item.name : undefined}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-70 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      {item.icon}
                    </svg>
                    {!isCollapsed && item.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </nav>

      <div className="mt-auto pt-8 border-t border-white/20 shrink-0">
        <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold shrink-0">
            U
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <p className="font-medium text-sm truncate">Usuario</p>
              <p className="text-xs text-white/70 truncate">Admin</p>
            </div>
          )}
        </div>
      </div>
    </OverlayScrollbarsComponent>
  );
}
