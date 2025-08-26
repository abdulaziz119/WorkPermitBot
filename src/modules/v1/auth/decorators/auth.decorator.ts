import { applyDecorators, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

class OptionalAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any, context: any) {
    if (err || !user) {
      return null;
    }
    return user;
  }
}

export function Auth(optional: boolean = false) {
  if (optional) {
    return applyDecorators(UseGuards(OptionalAuthGuard));
  }
  return applyDecorators(UseGuards(AuthGuard('jwt')));
}
