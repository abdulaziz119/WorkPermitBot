import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JWT_SECRET } from '../../../utils/env/env';

@Injectable()
export class JwtOptionalStrategy extends PassportStrategy(
  Strategy,
  'jwt-optional',
) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: JWT_SECRET,
      passReqToCallback: false,
      ignoreExpiration: false,
    });
  }

  async validate(payload: any): Promise<any> {
    if (!payload || !payload.id) {
      return null;
    }

    return {
      id: payload.id,
      role: payload.role,
      email: payload.email,
    };
  }

  authenticate(req: any, options?: any) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return this.success(null);
    }

    return super.authenticate(req, options);
  }
}
