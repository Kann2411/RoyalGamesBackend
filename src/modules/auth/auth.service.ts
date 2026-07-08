import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { OAuth2Client } from 'google-auth-library';
import { User } from '../users/entities/user.entity';
import { PasswordUtils } from '../../common/utils/password.utils';
import { LoginDto } from './dtos/login.dto';

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
  ) {
    this.googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }

  async login(loginDto: LoginDto) {
    const emailLowerCase = loginDto.email.toLowerCase();
    const user = await this.usersRepository.findOne({
      where: { email: emailLowerCase },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.password) {
      throw new UnauthorizedException(
        'Esta cuenta fue creada con Google. Por favor inicia sesión con Google.',
      );
    }

    const passwordMatch = await PasswordUtils.comparePasswords(
      loginDto.password,
      user.password,
    );

    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      nick: user.nick,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        nick: user.nick,
        role: user.role,
      },
    };
  }

  async loginWithGoogle(idToken: string) {
    // 1. Verificar el id_token con Google
    let payload: any;
    let firstChipsReceived = false;
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (err) {
      throw new UnauthorizedException('Token de Google inválido o expirado');
    }

    if (!payload || !payload.email) {
      throw new UnauthorizedException('No se pudo obtener el email de Google');
    }

    const { sub: googleId, email, name, picture } = payload;
    const emailLower = email.toLowerCase();

    // 2. Buscar usuario existente por email
    let user = await this.usersRepository.findOne({
      where: { email: emailLower },
    });

    if (user) {
      // Actualizar googleId si aún no lo tiene (usuario ya registrado que ahora usa Google)
      if (!user.googleId) {
        user.googleId = googleId;
        if (!user.image && picture) {
          user.image = picture;
        }
        await this.usersRepository.save(user);
      }
    } else {
      // 3. Crear usuario nuevo (registro via Google)
      // Generar un nick único a partir del nombre de Google
      let baseNick = (name || email.split('@')[0])
        .replace(/[^a-zA-Z0-9_]/g, '')
        .substring(0, 20);
      if (!baseNick) baseNick = 'user';

      // Asegurarse de que el nick sea único
      let nick = baseNick;
      let counter = 1;
      while (await this.usersRepository.findOne({ where: { nick } })) {
        nick = `${baseNick}${counter}`;
        counter++;
      }

      user = this.usersRepository.create({
        email: emailLower,
        nick,
        password: undefined,
        googleId,
        image: picture || undefined,
        chips: 0,
        firstChips: false,
      });

      user = await this.usersRepository.save(user);

      // Otorgar fichas iniciales atómicamente (solo a los primeros 100 usuarios)
      const updated = await this.usersRepository.query(
        `UPDATE users SET chips = chips + $1, "firstChips" = true
         WHERE id = $2
         AND ("firstChips" = false OR "firstChips" IS NULL)
         AND (SELECT COUNT(*) FROM users WHERE "firstChips" = true) < 100
         RETURNING *`,
        [1000000, user.id],
      );

      let updatedUserRow: any = null;
      if (Array.isArray(updated)) {
        if (Array.isArray(updated[0]) && updated[0].length > 0) {
          updatedUserRow = updated[0][0];
        } else if (updated.length > 0 && typeof updated[0] === 'object' && !Array.isArray(updated[0]) && Object.keys(updated[0]).length > 0) {
          updatedUserRow = updated[0];
        }
      }

      if (updatedUserRow && updatedUserRow.id) {
        user = updatedUserRow as User;
        firstChipsReceived = true;
      }


    }

    // 4. Generar JWT propio de Royal Games
    const jwtPayload = {
      sub: user.id,
      email: user.email,
      nick: user.nick,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(jwtPayload),
      firstChipsReceived,
      user: {
        id: user.id,
        email: user.email,
        nick: user.nick,
        role: user.role,
        image: user.image,
      },
    };
  }

  async validateUser(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }
}
