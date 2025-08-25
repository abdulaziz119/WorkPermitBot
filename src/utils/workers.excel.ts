import { Injectable } from '@nestjs/common';
import { WorkerEntity } from '../entity/workers.entity';
import { AttendanceEntity } from '../entity/attendance.entity';
import { RequestEntity } from '../entity/requests.entity';

export interface WorkerAttendanceData {
  worker: WorkerEntity;
  attendances: AttendanceEntity[];
  requests?: RequestEntity[];
}

@Injectable()
export class WorkersExcelService {
  generateExcelBuffer(data: WorkerAttendanceData[], period: string): Buffer {
    // Simple CSV format for now - can be enhanced with actual Excel library
    const lines: string[] = [];

    // Header in Uzbek
    lines.push(
      `Ishchi nomi,Telegram ID,Sana,Kelish vaqti,Ketish vaqti,Holati,Period:${period}`,
    );

    for (const item of data) {
      const worker = item.worker;
      if (item.attendances.length === 0) {
        // Check if there's a leave request for this period
        const hasLeaveRequest = item.requests && item.requests.length > 0;
        const status = hasLeaveRequest ? "Javob so'ragan" : 'Kelmagan';
        lines.push(
          `"${worker.fullname}",${worker.telegram_id},Yozuv yo'q,,,${status}`,
        );
      } else {
        for (const att of item.attendances) {
          const checkIn = att.check_in
            ? new Date(att.check_in).toLocaleTimeString()
            : "Yo'q";
          const checkOut = att.check_out
            ? new Date(att.check_out).toLocaleTimeString()
            : "Yo'q";

          // Check if there's a leave request for this specific date
          const attDate =
            att.date || new Date(att.created_at).toISOString().split('T')[0];
          const hasLeaveRequestForDate =
            item.requests &&
            item.requests.some((req) => {
              if (!req.approved_date) return false;
              const reqDate = new Date(req.approved_date)
                .toISOString()
                .split('T')[0];
              return reqDate === attDate;
            });

          let status = 'Kelmagan';
          if (att.check_in) {
            status = 'Kelgan';
          } else if (hasLeaveRequestForDate) {
            status = "Javob so'ragan";
          }

          const dateStr =
            typeof att.date === 'string'
              ? att.date
              : new Date(att.created_at).toLocaleDateString();
          lines.push(
            `"${worker.fullname}",${worker.telegram_id},"${dateStr}","${checkIn}","${checkOut}","${status}"`,
          );
        }
      }
    }

    return Buffer.from(lines.join('\n'), 'utf-8');
  }

  getFileName(period: string, workerName?: string): string {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const prefix = workerName ? `${workerName.replace(/\s+/g, '_')}_` : '';
    return `${prefix}attendance_${period}_${dateStr}.csv`;
  }
}
