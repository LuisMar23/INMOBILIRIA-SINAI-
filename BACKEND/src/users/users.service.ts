import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt'; // CORREGIDO: usar * as bcrypt
import { PrismaService } from 'src/config/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
  const passwordHash = await bcrypt.hash(dto.password, 10);

  return this.prisma.user.create({
    data: {
      fullName: dto.fullName,
      username: dto.username,
      ci: dto.ci,
      email: dto.email,
      passwordHash,
      avatarUrl: dto.avatarUrl,
      telefono: dto.telefono,
  
    },
  });
}

  findAll() {
    return this.prisma.user.findMany();
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) throw new NotFoundException(`User with ID ${id} not found`);
    return user;
  }

async update(id: number, dto: UpdateUserDto) {
  const user = await this.findOne(id);

  let passwordHash = user.passwordHash;
  if (dto.password) {
    passwordHash = await bcrypt.hash(dto.password, 10);
  }

  return this.prisma.user.update({
    where: { id },
    data: {
      fullName: dto.fullName ?? user.fullName,
      username: dto.username ?? user.username,
      ci: dto.ci ?? user.ci,
      email: dto.email ?? user.email,
      passwordHash,
      avatarUrl: dto.avatarUrl ?? user.avatarUrl,
      telefono: dto.telefono ?? user.telefono,

    },
  });
}

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.user.delete({
      where: { id },
    });
  }
  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (!user.passwordHash) {
      throw new UnauthorizedException(
        'El usuario no tiene una contraseña registrada',
      );
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch)
      throw new UnauthorizedException('Contraseña actual incorrecta');

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashedPassword },
    });

    return { message: 'Contraseña actualizada correctamente' };
  }
async getCiudadesDisponibles(): Promise<string[]> {
  const lotes = await this.prisma.lote.findMany({
    select: { ciudad: true },
    distinct: ['ciudad'],
  });
  return lotes.map(l => l.ciudad).sort();
}

}
