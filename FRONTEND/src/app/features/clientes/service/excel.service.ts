// core/services/excel.service.ts
import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';

@Injectable({ providedIn: 'root' })
export class ExcelService {
  /**
   * Exporta datos a Excel
   * @param data Array de datos a exportar
   * @param fileName Nombre del archivo (sin extensión)
   * @param sheetName Nombre de la hoja
   */
  exportToExcel(data: any[], fileName: string, sheetName: string = 'Datos'): void {
    if (!data || data.length === 0) {
      console.warn('No hay datos para exportar');
      return;
    }

    // Crear worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Ajustar ancho de columnas (opcional)
    const columnWidths = this.calculateColumnWidths(data);
    worksheet['!cols'] = columnWidths;

    // Crear workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Generar y descargar archivo
    XLSX.writeFile(workbook, `${fileName}_${this.getCurrentDate()}.xlsx`);
  }

  /**
   * Exporta clientes con formato específico
   */
  exportClientesToExcel(clientes: any[], fileName: string = 'clientes'): void {
    // Transformar datos para Excel
    const datosExcel = clientes.map((cliente) => ({
      ID: cliente.id,
      'NOMBRE COMPLETO': cliente.fullName,
      CI: cliente.ci,
      TELÉFONO: cliente.telefono,

      DIRECCIÓN: cliente.direccion || 'No registrada',
      'FECHA REGISTRO': cliente.createdAt
        ? new Date(cliente.createdAt).toLocaleDateString('es-BO')
        : 'No registrada',
    }));

    this.exportToExcel(datosExcel, fileName, 'Clientes');
  }

  /**
   * Exporta un cliente individual
   */

  /**
   * Calcula el ancho óptimo de las columnas
   */
  private calculateColumnWidths(data: any[]): { wch: number }[] {
    if (!data || data.length === 0) return [];

    const columnWidths: { wch: number }[] = [];
    const headers = Object.keys(data[0]);

    headers.forEach((header, index) => {
      let maxLength = header.length;

      data.forEach((row) => {
        const value = row[header]?.toString() || '';
        maxLength = Math.max(maxLength, value.length);
      });

      // Limitar ancho máximo a 50 caracteres
      columnWidths[index] = { wch: Math.min(maxLength + 2, 50) };
    });

    return columnWidths;
  }

  /**
   * Obtiene la fecha actual para el nombre del archivo
   */
  private getCurrentDate(): string {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
  }
}
