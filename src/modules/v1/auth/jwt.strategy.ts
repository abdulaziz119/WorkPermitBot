import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JWT_SECRET } from '../../../utils/env/env';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: JWT_SECRET,
    });
  }

  async validate(payload: any): Promise<any> {
    if (!payload.id) {
      throw new UnauthorizedException('Invalid token payload');
    }

    return {
      id: payload.id,
      role: payload.role,
      phone: payload.phone,
    };
  }
}
