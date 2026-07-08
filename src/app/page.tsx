import React from "react";
import Image from "next/image";

export default function Home() {
  return (
    <div className="flex h-full w-full bg-white rounded-[2rem] shadow-sm overflow-hidden">
      {/* Left Column */}
      <div className="w-[55%] p-6 lg:p-10 flex flex-col overflow-y-auto mac-scrollbar">
        
        <div className="my-auto">
          <div className="mb-5">
            <Image 
              src="/main_logo.png" 
              alt="Logo Principal" 
              width={140} 
              height={40} 
              className="object-contain -ml-2"
              priority
            />
          </div>

          <div className="mb-3">
          <h1 className="text-[1.875rem] leading-[1.2] text-blue-manhattan-1">
            <span className="font-avenir font-light block opacity-80 text-[1.5rem] mb-1">Bienvenido al</span>
            <span className="font-avenir-demi block">Sistema de Gestión</span>
            <span className="font-avenir-demi block">de Calidad</span>
          </h1>
        </div>

        <div className="w-12 h-1 bg-aviva-turquoise-1 mb-5 rounded-full"></div>

        <p className="text-gray-500 font-avenir text-[13px] mb-8 max-w-sm leading-relaxed">
          Un espacio diseñado para gestionar, controlar y mejorar nuestros procesos. 
          Nuestro propósito es garantizar la calidad y seguridad en cada atención.
        </p>

        <div className="space-y-3">
          {/* Row 1: Calidad */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#E6F4F1] flex items-center justify-center shrink-0 shadow-sm border border-teal-100/50">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#2A9D8F]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <div>
              <h3 className="font-avenir-demi text-blue-manhattan-1 text-[14px]">Calidad</h3>
              <p className="font-avenir text-gray-500 text-[11px] mt-[1px]">Procesos estandarizados y controlados.</p>
            </div>
          </div>

          {/* Row 2: Seguridad */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#E0F7FA] flex items-center justify-center shrink-0 shadow-sm border border-cyan-100/50">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#00BCD4]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h3 className="font-avenir-demi text-blue-manhattan-1 text-[14px]">Seguridad</h3>
              <p className="font-avenir text-gray-500 text-[11px] mt-[1px]">Cultura de seguridad del paciente.</p>
            </div>
          </div>

          {/* Row 3: Mejora Continua */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#E8F0FE] flex items-center justify-center shrink-0 shadow-sm border border-blue-100/50">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#4285F4]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div>
              <h3 className="font-avenir-demi text-blue-manhattan-1 text-[14px]">Mejora Continua</h3>
              <p className="font-avenir text-gray-500 text-[11px] mt-[1px]">Evaluamos, aprendemos y evolucionamos para brindar siempre lo mejor.</p>
            </div>
          </div>
        </div>

        </div>
      </div>

      {/* Right Column (Image) */}
      <div className="w-[45%] bg-[#F8FAFC] relative overflow-hidden">
        <Image 
          src="/main_image.png"
          alt="Imagen Principal"
          fill
          className="object-cover object-center"
          priority
        />
        
        {/* Forma de onda (SVG Shape Divider) */}
        <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-[0]">
          <svg 
            viewBox="0 0 1440 500" 
            preserveAspectRatio="none" 
            className="w-full h-[80px] lg:h-[120px]"
          >
            {/* 1. Onda trasera (Turquesa Aviva) */}
            <path 
              className="fill-[#33869B] opacity-80" 
              d="M 0 20 C 360 20, 360 200, 720 200 C 1080 200, 1080 20, 1440 20 L 1440 500 L 0 500 Z"
            ></path>
            {/* 2. Onda central (Azul) */}
            <path 
              className="fill-[#4285F4] opacity-60" 
              d="M 0 20 C 360 20, 360 230, 720 230 C 1080 230, 1080 60, 1440 60 L 1440 500 L 0 500 Z"
            ></path>
            {/* 3. Onda frontal (Blanca) */}
            <path 
              className="fill-white opacity-90" 
              d="M 0 20 C 360 20, 360 260, 720 260 C 1080 260, 1080 100, 1440 100 L 1440 500 L 0 500 Z"
            ></path>
          </svg>
        </div>

        {/* Texto decorativo inferior */}
        <div className="absolute bottom-4 left-5 lg:bottom-5 lg:left-6 z-10 flex flex-col">
          <span className="text-aviva-turquoise-1 text-[2.25rem] lg:text-[2.75rem] font-serif font-black leading-[0.6]">
            &ldquo;
          </span>
          <p className="font-avenir-demi text-blue-manhattan-1 text-[13px] lg:text-[15px] leading-snug -mt-1">
            La salud como<br />
            debe ser
          </p>
        </div>
      </div>
    </div>
  );
}
