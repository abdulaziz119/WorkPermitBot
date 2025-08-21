import { Injectable } from '@nestjs/common';
import { WorkerEntity } from '../entity/workers.entity';
import { AttendanceEntity } from '../entity/attendance.entity';

export interface WorkerAttendanceData {
  worker: WorkerEntity;
  attendances: AttendanceEntity[];
}

@Injectable()
export class WorkersExcelService {
  generateExcelBuffer(data: WorkerAttendanceData[], period: string): Buffer {
    // Simple CSV format for now - can be enhanced with actual Excel library
    const lines: string[] = [];

    // Header
    lines.push('Worker Name,Telegram ID,Date,Check In,Check Out,Status');

    for (const item of data) {
      const worker = item.worker;
      if (item.attendances.length === 0) {
        // No attendance records
        lines.push(
          `"${worker.fullname}",${worker.telegram_id},No Records,,,Absent`,
        );
      } else {
        for (const att of item.attendances) {
          const checkIn = att.check_in
            ? new Date(att.check_in).toLocaleTimeString()
            : 'N/A';
          const checkOut = att.check_out
            ? new Date(att.check_out).toLocaleTimeString()
            : 'N/A';
          const status = att.check_in ? 'Present' : 'Absent';
          const date =
            att.date || new Date(att.created_at).toLocaleDateString();
          lines.push(
            `"${worker.fullname}",${worker.telegram_id},"${date}","${checkIn}","${checkOut}","${status}"`,
          );
        }
      }
    }

    return Buffer.from(lines.join('\n'), 'utf-8');
  }

  getFileName(period: string): string {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    return `attendance_${period}_${dateStr}.csv`;
  }
}
