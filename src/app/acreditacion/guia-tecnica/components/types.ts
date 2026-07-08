export interface Macroproceso {
  id: string;
  codigo: string;
  nombre: string;
  orden: number;
}

export interface Codigo {
  id: string;
  codigo: string;
  descripcion: string;
  orden: number;
}

export interface Criterio {
  id: string;
  codigo_criterio: string;
  descripcion: string;
  codigo_id: string;
  fuente_0?: string;
  fuente_1?: string;
  fuente_2?: string;
}
