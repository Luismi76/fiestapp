import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlatformConfigService } from '../platform-config/platform-config.service';
import { FiscalClosureService } from '../invoicing/fiscal-closure.service';
import { AccountingService } from './accounting.service';

export type TaskSeverity = 'critical' | 'warning' | 'info';

export interface AdminPendingTask {
  id: string;
  severity: TaskSeverity;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  count?: number;
}

/**
 * Calcula "qué tiene que hacer hoy" el admin (fiscal + operativa crítica).
 * Diseñado para un admin no experto: mensajes humanos, acciones claras,
 * prioridad visual según urgencia.
 */
@Injectable()
export class AdminTasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly platformConfig: PlatformConfigService,
    private readonly fiscalClosure: FiscalClosureService,
    private readonly accounting: AccountingService,
  ) {}

  async getPendingTasks(): Promise<AdminPendingTask[]> {
    const tasks: AdminPendingTask[] = [];
    const now = new Date();

    // 1. Datos del emisor sin configurar
    const issuer = this.platformConfig.getIssuerData();
    const issuerHasPlaceholder =
      issuer.taxId === 'PENDIENTE' ||
      issuer.name.toLowerCase().includes('placeholder') ||
      issuer.address.toLowerCase().includes('pendiente');
    if (issuerHasPlaceholder) {
      const invoiceCount = await this.prisma.invoice.count({
        where: { status: 'ISSUED' },
      });
      const isCritical = invoiceCount > 0;
      tasks.push({
        id: 'issuer_data_missing',
        severity: isCritical ? 'critical' : 'warning',
        title: 'Datos del emisor sin configurar',
        description: isCritical
          ? `Las facturas se están emitiendo con datos "PENDIENTE". Configura tu nombre fiscal, NIF y dirección ya (obligación RD 1619/2012).`
          : 'Configura tu nombre fiscal, NIF y dirección antes de emitir la primera factura.',
        ctaLabel: 'Configurar datos del emisor',
        ctaHref: '/admin/finanzas?tab=configuracion',
      });
    }

    // 2. Trimestre anterior terminado pendiente de cerrar
    const currentYear = now.getUTCFullYear();
    const currentQuarterIndex = Math.floor(now.getUTCMonth() / 3); // 0-3
    const prevQuarter =
      currentQuarterIndex === 0
        ? { year: currentYear - 1, q: 4 }
        : { year: currentYear, q: currentQuarterIndex };
    const prevQuarterEnd = new Date(
      Date.UTC(prevQuarter.year, prevQuarter.q * 3, 1),
    );
    const daysSincePrevQuarterEnd = Math.floor(
      (now.getTime() - prevQuarterEnd.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysSincePrevQuarterEnd > 0) {
      const period = `${prevQuarter.year}-Q${prevQuarter.q}`;
      const isClosed = await this.fiscalClosure.isPeriodClosed(period);
      if (!isClosed) {
        const invoicesInPeriod = await this.prisma.invoice.count({
          where: { fiscalPeriod: period, status: 'ISSUED' },
        });
        if (invoicesInPeriod > 0) {
          // Modelo 303 se presenta dentro de los 20 días siguientes al fin
          // de trimestre. Pasado ese plazo, lo marcamos como crítico.
          const severity: TaskSeverity =
            daysSincePrevQuarterEnd > 20 ? 'critical' : 'warning';
          tasks.push({
            id: 'prev_quarter_open',
            severity,
            title: `Trimestre ${period} pendiente de cerrar`,
            description:
              daysSincePrevQuarterEnd > 20
                ? `Han pasado ${daysSincePrevQuarterEnd} días desde el fin del trimestre. Presenta el 303 con tu asesor y cierra el periodo en el panel.`
                : `Presenta el 303 y marca el cierre cuando esté hecho. ${invoicesInPeriod} facturas emitidas en el periodo.`,
            ctaLabel: 'Ir a Cierres',
            ctaHref: '/admin/finanzas?tab=declaraciones&sub=cierres',
            count: invoicesInPeriod,
          });
        }
      }
    }

    // 3. Anfitriones reportables DAC7 con datos incompletos
    // Usa el año actual (DAC7 se presenta en enero del año siguiente)
    try {
      const dac7 = await this.accounting.getDac7Report(currentYear);
      if (dac7.summary.hostsWithIncompleteData > 0) {
        // Cercano al plazo del 31 de enero del año siguiente → crítico
        const isJanuaryOfReportYear =
          now.getUTCMonth() === 0 && now.getUTCFullYear() === currentYear + 1;
        tasks.push({
          id: 'dac7_incomplete_hosts',
          severity: isJanuaryOfReportYear ? 'critical' : 'warning',
          title: `${dac7.summary.hostsWithIncompleteData} anfitriones con datos DAC7 incompletos`,
          description:
            'Necesitan NIF, fecha de nacimiento y país de residencia para el informe anual DAC7 ante AEAT (plazo: 31 de enero).',
          ctaLabel: 'Revisar Informe UE',
          ctaHref: '/admin/finanzas?tab=declaraciones&sub=ue',
          count: dac7.summary.hostsWithIncompleteData,
        });
      }
    } catch {
      // Si falla el cálculo DAC7 no rompemos la lista entera
    }

    // 4. Facturas recientes con envío por email fallido
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const unsentInvoices = await this.prisma.invoice.count({
      where: {
        status: 'ISSUED',
        emailedAt: null,
        issueDate: { gte: thirtyDaysAgo },
      },
    });
    if (unsentInvoices > 0) {
      tasks.push({
        id: 'unsent_invoices',
        severity: 'info',
        title: `${unsentInvoices} ${unsentInvoices === 1 ? 'factura no enviada' : 'facturas no enviadas'} por email`,
        description:
          'El email al cliente falló en la emisión. Puedes reenviarlas una a una desde el panel de Facturas.',
        ctaLabel: 'Revisar facturas',
        ctaHref: '/admin/finanzas?tab=facturas',
        count: unsentInvoices,
      });
    }

    // Ordenar por severidad: critical → warning → info
    const order: Record<TaskSeverity, number> = {
      critical: 0,
      warning: 1,
      info: 2,
    };
    return tasks.sort((a, b) => order[a.severity] - order[b.severity]);
  }
}
