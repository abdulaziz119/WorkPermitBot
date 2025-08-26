import { SetMetadata } from '@nestjs/common';
import { UserRoleEnum } from '../../../../utils/enum/user.enum';

export const ROLES_KEY = 'ROLES_KEY';
export const Roles = (...roles: UserRoleEnum[]) =>
  SetMetadata(ROLES_KEY, roles);
