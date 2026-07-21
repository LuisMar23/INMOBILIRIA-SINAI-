import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'default-secret-key',
    });
  }

async validate(payload: any) {
  try {
    const user = await this.authService.validateUser(payload.sub);

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
 
    };
  } catch (error) {
    throw new UnauthorizedException('Token inválido o usuario no encontrado');
  }
}
}
