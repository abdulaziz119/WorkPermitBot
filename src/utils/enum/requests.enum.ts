export enum RequestsStatusEnum {
  PENDING = 'pending',
  REJECTED = 'rejected',
  APPROVED = 'approved',
}

export enum RequestTypeEnum {
  DAILY = 'daily', // 1 kunlik - Super Admin tasdiqlashi kerak
  HOURLY = 'hourly', // Soatlik - Admin role Manager tasdiqlashi kerak
}

export enum HourlyRequestTypeEnum {
  COMING_LATE = 'coming_late', // Kech kelish - hali ishga kelmagan
  LEAVING_EARLY = 'leaving_early', // Erta ketish - ishda va erta ketmoqchi
}
