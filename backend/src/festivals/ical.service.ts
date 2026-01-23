import { Injectable } from '@nestjs/common';

interface FestivalEvent {
  id: string;
  name: string;
  city: string;
  description?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
}

@Injectable()
export class ICalService {
  /**
   * Genera un evento iCal individual
   */
  generateICalEvent(festival: FestivalEvent): string {
    const uid = `${festival.id}@fiestapp.es`;
    const now = new Date();
    const dtstamp = this.formatDate(now);

    // Si no hay fecha de inicio, usar una fecha predeterminada
    const startDate = festival.startDate || new Date(now.getFullYear(), 0, 1);
    const endDate = festival.endDate || startDate;

    const dtstart = this.formatDate(startDate);
    const dtend = this.formatDate(endDate);

    const description = this.escapeICalText(
      festival.description || `Festival en ${festival.city}`
    );
    const summary = this.escapeICalText(festival.name);
    const location = this.escapeICalText(festival.city);

    return [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${dtstart}`,
      `DTEND;VALUE=DATE:${dtend}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${location}`,
      'STATUS:CONFIRMED',
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
    ].join('\r\n');
  }

  /**
   * Genera un feed iCal completo con multiples festivales
   */
  generateICalFeed(festivals: FestivalEvent[]): string {
    const header = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//FiestApp//Festivales Espanoles//ES',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Festivales de Espana - FiestApp',
      'X-WR-TIMEZONE:Europe/Madrid',
    ].join('\r\n');

    const events = festivals
      .map((festival) => this.generateICalEvent(festival))
      .join('\r\n');

    const footer = 'END:VCALENDAR';

    return `${header}\r\n${events}\r\n${footer}`;
  }

  /**
   * Genera URL para Google Calendar
   */
  generateGoogleCalendarUrl(festival: FestivalEvent): string {
    const startDate = festival.startDate || new Date();
    const endDate = festival.endDate || startDate;

    const dates = `${this.formatDateForGoogle(startDate)}/${this.formatDateForGoogle(endDate)}`;
    const text = encodeURIComponent(festival.name);
    const location = encodeURIComponent(festival.city);
    const details = encodeURIComponent(
      festival.description || `Festival en ${festival.city}`
    );

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&location=${location}&details=${details}`;
  }

  /**
   * Genera URL para Apple Calendar (webcal)
   */
  generateAppleCalendarUrl(baseUrl: string, festivalId?: string): string {
    const url = festivalId
      ? `${baseUrl}/api/festivals/${festivalId}/ical`
      : `${baseUrl}/api/festivals/ical`;

    return url.replace('https://', 'webcal://').replace('http://', 'webcal://');
  }

  // Helpers privados

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  private formatDateForGoogle(date: Date): string {
    return this.formatDate(date);
  }

  private escapeICalText(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  }
}
