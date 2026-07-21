// src/auth/auth.service.ts
// CAMBIOS RESPECTO A LA VERSIÓN ANTERIOR:
// - Eliminado ciudadesAsignadas de JWT y todos los métodos
// - generateTokens solo lleva sub, email, role
// - register y updateUser ya no manejan ciudadesAsignadas
// - Las urbanizaciones se gestionan desde SeguridadService

import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  InternalServerErrorException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RegisterDto, UserRole } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from 'src/config/prisma.service';
import { UpdateClienteDto } from './dto/update-cliente.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  private getCurrentTimeLaPaz(): Date {
    const now = new Date();
    const offset = -4 * 60;
    const localTime = new Date(now.getTime() + offset * 60 * 1000);
    return localTime;
  }

  // ============================================================
  // JWT - sin ciudadesAsignadas
  // ============================================================
  private async generateTokens(userId: number, email: string, role: string) {
    const payload = {
      sub: userId,
      email: email.toLowerCase(),
      role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        expiresIn: process.env.JWT_EXPIRES_IN || '15m',
        secret: process.env.JWT_SECRET || 'default-secret-key',
      }),
      this.jwtService.signAsync(payload, {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
        secret: process.env.JWT_REFRESH_SECRET || 'default-secret-key',
      }),
    ]);

    return { accessToken, refreshToken };
  }

  // ============================================================
  // REGISTER
  // ============================================================
  async register(registerDto: RegisterDto) {
    const {
      username,
      email,
      password,
      fullName,
      ci,
      telefono,
      direccion,
      observaciones,
    } = registerDto;

    try {
      const normalizedEmail = email ? email.toLowerCase().trim() : null;
      const normalizedUsername = username.toLowerCase().trim();
      const normalizedCi = ci ? ci.trim() : null;
      const normalizedTelefono = telefono ? telefono.trim() : null;

      const existingUser = await this.prisma.user.findFirst({
        where: {
          OR: [
            ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
            { username: normalizedUsername },
            ...(normalizedCi ? [{ ci: normalizedCi }] : []),
            ...(normalizedTelefono ? [{ telefono: normalizedTelefono }] : []),
          ],
        },
      });

      if (existingUser) {
        if (normalizedEmail && existingUser.email === normalizedEmail)
          throw new ConflictException('El email ya está registrado');
        if (existingUser.username === normalizedUsername)
          throw new ConflictException('El nombre de usuario ya existe');
        if (normalizedCi && existingUser.ci === normalizedCi)
          throw new ConflictException('El CI ya está registrado');
        if (normalizedTelefono && existingUser.telefono === normalizedTelefono)
          throw new ConflictException('El teléfono ya está registrado');
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const user = await this.prisma.user.create({
        data: {
          username: normalizedUsername,
          email: normalizedEmail,
          passwordHash: hashedPassword,
          fullName: fullName.trim(),
          ci: normalizedCi ?? '',
          telefono: normalizedTelefono ?? '',
          isActive: true,
          role: registerDto.role ?? UserRole.USUARIO,
          direccion: direccion?.trim() ?? null,
          observaciones: observaciones?.trim() ?? null,
        },
        select: {
          id: true,
          uuid: true,
          username: true,
          email: true,
          fullName: true,
          avatarUrl: true,
          role: true,
          direccion: true,
          observaciones: true,
          createdAt: true,
        },
      });

      const userEmail = user.email ?? `user${user.id}@inmobiliaria.com`;
      const tokens = await this.generateTokens(user.id, userEmail, user.role);

      await this.prisma.auditoria.create({
        data: {
          usuarioId: user.id,
          accion: 'REGISTRO',
          tablaAfectada: 'User',
          registroId: user.id,
          datosDespues: JSON.stringify({
            username: user.username,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
          }),
          ip: '127.0.0.1',
          dispositivo: 'API',
        },
      });

      return {
        success: true,
        message: 'Usuario registrado correctamente',
        data: { user, ...tokens },
      };
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  // ============================================================
  // LOGIN
  // ============================================================
  async login(loginDto: LoginDto) {
    const { identifier, password } = loginDto;

    try {
      const normalizedIdentifier = identifier.toLowerCase().trim();

      const user = await this.prisma.user.findFirst({
        where: {
          OR: [
            { email: { equals: normalizedIdentifier, mode: 'insensitive' } },
            { username: { equals: normalizedIdentifier, mode: 'insensitive' } },
          ],
          isActive: true,
          role: { not: UserRole.CLIENTE },
        },
      });

      if (!user) throw new UnauthorizedException('Credenciales inválidas');
      if (!user.passwordHash)
        throw new UnauthorizedException(
          'Este usuario no tiene credenciales de acceso',
        );

      const now = this.getCurrentTimeLaPaz();

      if (user.lockUntil && user.lockUntil > now) {
        const diffMs = user.lockUntil.getTime() - now.getTime();
        const diffMin = Math.ceil(diffMs / (1000 * 60));
        throw new UnauthorizedException(
          `Cuenta bloqueada. Intenta nuevamente en ${diffMin} minutos.`,
        );
      }

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

      if (!isPasswordValid) {
        const failedAttempts = (user.failedAttempts || 0) + 1;
        const lockUntil =
          failedAttempts >= 5 ? new Date(now.getTime() + 5 * 60 * 1000) : null;

        await this.prisma.user.update({
          where: { id: user.id },
          data: { failedAttempts, lockUntil },
        });

        const message =
          failedAttempts >= 5
            ? 'Demasiados intentos fallidos. Tu cuenta se bloqueó por 5 minutos.'
            : 'Credenciales inválidas';

        throw new UnauthorizedException(message);
      }

      if (user.failedAttempts > 0 || user.lockUntil) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { failedAttempts: 0, lockUntil: null, lastLogin: now },
        });
      }

      // Obtener todos los módulos activos
      const todosLosModulos = await this.prisma.modulo.findMany({
        where: { activo: true },
      });

      // Obtener permisos del role
      const permisos = await this.prisma.permisoRole.findMany({
        where: { role: user.role },
        include: { modulo: true },
      });

      // Construir map con todos los módulos, true o false
      const permisosConAcceso = new Set(
        permisos.filter((p) => p.tieneAcceso).map((p) => p.modulo.clave),
      );

      const permisosMap = todosLosModulos.reduce(
        (acc, modulo) => {
          acc[modulo.clave] = permisosConAcceso.has(modulo.clave);
          return acc;
        },
        {} as Record<string, boolean>,
      );

      const userEmail = user.email ?? `user${user.id}@inmobiliaria.com`;
      const tokens = await this.generateTokens(user.id, userEmail, user.role);

      await this.prisma.auditoria.create({
        data: {
          usuarioId: user.id,
          accion: 'LOGIN',
          tablaAfectada: 'User',
          registroId: user.id,
          ip: '127.0.0.1',
          dispositivo: 'API',
        },
      });

      return {
        success: true,
        message: 'Login exitoso',
        data: {
          user: {
            id: user.id,
            uuid: user.uuid,
            username: user.username,
            email: user.email,
            fullName: user.fullName,
            avatarUrl: user.avatarUrl,
            role: user.role,
          },
          permisos: permisosMap,
          ...tokens,
        },
      };
    } catch (error) {
      console.error('LOGIN ERROR:', JSON.stringify(error, null, 2));
      throw error;
    }
  }

  // ============================================================
  // REFRESH TOKEN
  // ============================================================
  async refreshToken(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'default-secret-key',
      });

      const user = await this.prisma.user.findUnique({
        where: {
          id: payload.sub,
          isActive: true,
          role: { not: UserRole.CLIENTE },
        },
        select: { id: true, role: true, email: true },
      });

      if (!user) throw new UnauthorizedException('Usuario no encontrado');

      const userEmail = user.email ?? `user${user.id}@inmobiliaria.com`;
      const tokens = await this.generateTokens(user.id, userEmail, user.role);

      return {
        success: true,
        message: 'Token refrescado correctamente',
        data: tokens,
      };
    } catch (error) {
      throw new UnauthorizedException('Token de refresco inválido');
    }
  }

  // ============================================================
  // VALIDATE USER (usado por JwtStrategy)
  // ============================================================
  async validateUser(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, isActive: true, role: { not: UserRole.CLIENTE } },
      select: {
        id: true,
        uuid: true,
        username: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        role: true,
        isActive: true,
      },
    });

    if (!user) throw new UnauthorizedException('Usuario no encontrado');
    return user;
  }

  // ============================================================
  // CHANGE PASSWORD
  // ============================================================
  async changePassword(changePasswordDto: ChangePasswordDto) {
    const { identifier, newPassword, confirmPassword } = changePasswordDto;

    if (newPassword !== confirmPassword)
      throw new BadRequestException('Las contraseñas no coinciden');

    const passwordRegex =
      /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      throw new BadRequestException(
        'La contraseña debe tener al menos 8 caracteres, una letra mayúscula, un número y un símbolo.',
      );
    }

    try {
      const normalizedIdentifier = identifier.toLowerCase().trim();

      const user = await this.prisma.user.findFirst({
        where: {
          OR: [
            { email: { equals: normalizedIdentifier, mode: 'insensitive' } },
            { username: { equals: normalizedIdentifier, mode: 'insensitive' } },
          ],
          isActive: true,
          role: { not: UserRole.CLIENTE },
        },
      });

      if (!user)
        throw new NotFoundException(
          'No se encontró ningún usuario con ese username o email',
        );

      const hashedPassword = await bcrypt.hash(newPassword, 12);

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: hashedPassword,
          failedAttempts: 0,
          lockUntil: null,
        },
      });

      await this.prisma.auditoria.create({
        data: {
          usuarioId: user.id,
          accion: 'CAMBIO_CONTRASEÑA',
          tablaAfectada: 'User',
          registroId: user.id,
          ip: '127.0.0.1',
          dispositivo: 'API',
        },
      });

      return {
        success: true,
        message: 'Contraseña cambiada exitosamente',
        data: {
          user: { username: user.username, email: user.email, role: user.role },
        },
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      )
        throw error;
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  // ============================================================
  // USERS CRUD
  // ============================================================
  async getAllUsers() {
    try {
      const users = await this.prisma.user.findMany({
        where: { isActive: true, role: { not: UserRole.CLIENTE } },
        select: {
          id: true,
          uuid: true,
          username: true,
          email: true,
          fullName: true,
          ci: true,
          telefono: true,
          direccion: true,
          observaciones: true,
          role: true,
          isActive: true,
          avatarUrl: true,
          createdAt: true,
          urbanizacionesAsignadas: {
            include: { urbanizacion: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return { success: true, data: { users } };
    } catch (error) {
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async getUserById(userId: number) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId, isActive: true },
        select: {
          id: true,
          uuid: true,
          username: true,
          email: true,
          fullName: true,
          ci: true,
          telefono: true,
          direccion: true,
          observaciones: true,
          role: true,
          isActive: true,
          avatarUrl: true,
          createdAt: true,
          updatedAt: true,
          urbanizacionesAsignadas: {
            include: { urbanizacion: true },
          },
        },
      });

      if (!user) throw new NotFoundException('Usuario no encontrado');

      return { success: true, data: { user } };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async updateUser(userId: number, updateUserDto: UpdateUserDto) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId, isActive: true },
      });

      if (!user) throw new NotFoundException('Usuario no encontrado');

      const updateData: any = {};

      if (updateUserDto.fullName !== undefined)
        updateData.fullName = updateUserDto.fullName;
      if (updateUserDto.username !== undefined)
        updateData.username = updateUserDto.username;
      if (updateUserDto.email !== undefined)
        updateData.email = updateUserDto.email;
      if (updateUserDto.telefono !== undefined)
        updateData.telefono = updateUserDto.telefono;
      if (updateUserDto.direccion !== undefined)
        updateData.direccion = updateUserDto.direccion;
      if (updateUserDto.observaciones !== undefined)
        updateData.observaciones = updateUserDto.observaciones;
      if (updateUserDto.role !== undefined)
        updateData.role = updateUserDto.role;
      if (updateUserDto.isActive !== undefined)
        updateData.isActive = updateUserDto.isActive;

      if (updateUserDto.password?.trim()) {
        updateData.passwordHash = await bcrypt.hash(
          updateUserDto.password.trim(),
          10,
        );
      }

      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          uuid: true,
          username: true,
          email: true,
          fullName: true,
          ci: true,
          telefono: true,
          direccion: true,
          observaciones: true,
          role: true,
          isActive: true,
          avatarUrl: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      await this.prisma.auditoria.create({
        data: {
          usuarioId: userId,
          accion: 'ACTUALIZAR_USUARIO',
          tablaAfectada: 'User',
          registroId: userId,
          datosAntes: JSON.stringify(user),
          datosDespues: JSON.stringify(updatedUser),
          ip: '127.0.0.1',
          dispositivo: 'API',
        },
      });

      return {
        success: true,
        message: 'Usuario actualizado correctamente',
        data: { user: updatedUser },
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async deleteUser(userId: number) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId, isActive: true },
      });

      if (!user) throw new NotFoundException('Usuario no encontrado');

      await this.prisma.user.update({
        where: { id: userId },
        data: { isActive: false },
      });

      await this.prisma.auditoria.create({
        data: {
          usuarioId: userId,
          accion: 'ELIMINAR_USUARIO',
          tablaAfectada: 'User',
          registroId: userId,
          datosAntes: JSON.stringify(user),
          ip: '127.0.0.1',
          dispositivo: 'API',
        },
      });

      return { success: true, message: 'Usuario eliminado correctamente' };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  // ============================================================
  // CLIENTES CRUD
  // ============================================================
  async createCliente(createClienteDto: CreateClienteDto) {
    const { fullName, ci, telefono, direccion, observaciones } =
      createClienteDto;

    try {
      const normalizedCi = ci.trim();
      const normalizedTelefono = telefono.trim();

      const existingCliente = await this.prisma.user.findFirst({
        where: {
          OR: [{ ci: normalizedCi }, { telefono: normalizedTelefono }],
          role: UserRole.CLIENTE,
          isActive: true,
        },
      });

      if (existingCliente) {
        if (existingCliente.ci === normalizedCi)
          throw new ConflictException('Ya existe un cliente con este CI');
        if (existingCliente.telefono === normalizedTelefono)
          throw new ConflictException('Ya existe un cliente con este teléfono');
      }

      const cliente = await this.prisma.user.create({
        data: {
          fullName: fullName.trim(),
          ci: normalizedCi,
          telefono: normalizedTelefono,
          direccion: direccion?.trim(),
          observaciones: observaciones?.trim(),
          role: UserRole.CLIENTE,
          isActive: true,
          passwordHash: null,
          username: null,
          email: null,
        },
        select: {
          id: true,
          uuid: true,
          fullName: true,
          ci: true,
          telefono: true,
          direccion: true,
          observaciones: true,
          role: true,
          createdAt: true,
        },
      });

      await this.prisma.auditoria.create({
        data: {
          usuarioId: cliente.id,
          accion: 'REGISTRO_CLIENTE',
          tablaAfectada: 'User',
          registroId: cliente.id,
          datosDespues: JSON.stringify(cliente),
          ip: '127.0.0.1',
          dispositivo: 'API',
        },
      });

      return {
        success: true,
        message: 'Cliente registrado correctamente',
        data: { cliente },
      };
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async getClientes() {
    try {
      const clientes = await this.prisma.user.findMany({
        where: { isActive: true, role: UserRole.CLIENTE },
        select: {
          id: true,
          uuid: true,
          fullName: true,
          ci: true,
          telefono: true,
          direccion: true,
          observaciones: true,
          role: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return { success: true, data: { clientes } };
    } catch (error) {
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async getClienteById(clienteId: number) {
    try {
      const cliente = await this.prisma.user.findUnique({
        where: { id: clienteId, role: UserRole.CLIENTE, isActive: true },
        select: {
          id: true,
          uuid: true,
          fullName: true,
          ci: true,
          telefono: true,
          direccion: true,
          observaciones: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!cliente) throw new NotFoundException('Cliente no encontrado');

      return { success: true, data: { user: cliente } };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async updateCliente(clienteId: number, updateClienteDto: UpdateClienteDto) {
    try {
      const cliente = await this.prisma.user.findUnique({
        where: { id: clienteId, role: UserRole.CLIENTE, isActive: true },
      });

      if (!cliente) throw new NotFoundException('Cliente no encontrado');

      const normalizedCi = updateClienteDto.ci
        ? updateClienteDto.ci.trim()
        : cliente.ci;
      const normalizedTelefono = updateClienteDto.telefono.trim();

      const existingCliente = await this.prisma.user.findFirst({
        where: {
          id: { not: clienteId },
          OR: [{ ci: normalizedCi }, { telefono: normalizedTelefono }],
          role: UserRole.CLIENTE,
          isActive: true,
        },
      });

      if (existingCliente) {
        if (existingCliente.ci === normalizedCi)
          throw new ConflictException('Ya existe un cliente con este CI');
        if (existingCliente.telefono === normalizedTelefono)
          throw new ConflictException('Ya existe un cliente con este teléfono');
      }

      const updatedCliente = await this.prisma.user.update({
        where: { id: clienteId },
        data: {
          fullName: updateClienteDto.fullName.trim(),
          ci: normalizedCi,
          telefono: normalizedTelefono,
          direccion: updateClienteDto.direccion?.trim(),
          observaciones: updateClienteDto.observaciones?.trim(),
        },
        select: {
          id: true,
          uuid: true,
          fullName: true,
          ci: true,
          telefono: true,
          direccion: true,
          observaciones: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      await this.prisma.auditoria.create({
        data: {
          usuarioId: clienteId,
          accion: 'ACTUALIZAR_CLIENTE',
          tablaAfectada: 'User',
          registroId: clienteId,
          datosAntes: JSON.stringify(cliente),
          datosDespues: JSON.stringify(updatedCliente),
          ip: '127.0.0.1',
          dispositivo: 'API',
        },
      });

      return {
        success: true,
        message: 'Cliente actualizado correctamente',
        data: { cliente: updatedCliente },
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      )
        throw error;
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async deleteCliente(clienteId: number) {
    try {
      const cliente = await this.prisma.user.findUnique({
        where: { id: clienteId, role: UserRole.CLIENTE, isActive: true },
      });

      if (!cliente) throw new NotFoundException('Cliente no encontrado');

      await this.prisma.user.update({
        where: { id: clienteId },
        data: { isActive: false },
      });

      await this.prisma.auditoria.create({
        data: {
          usuarioId: clienteId,
          accion: 'ELIMINAR_CLIENTE',
          tablaAfectada: 'User',
          registroId: clienteId,
          datosAntes: JSON.stringify(cliente),
          ip: '127.0.0.1',
          dispositivo: 'API',
        },
      });

      return { success: true, message: 'Cliente eliminado correctamente' };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async getClientesWithDetails() {
    try {
      const clientes = await this.prisma.user.findMany({
        where: { isActive: true, role: UserRole.CLIENTE },
        select: {
          id: true,
          uuid: true,
          fullName: true,
          ci: true,
          telefono: true,
          direccion: true,
          observaciones: true,
          email: true,
          role: true,
          createdAt: true,
          ventasComoCliente: {
            where: { estado: { not: 'CANCELADO' } },
            include: {
              asesor: { select: { id: true, fullName: true, telefono: true } },
              lote: {
                select: {
                  id: true,
                  numeroLote: true,
                  manzano: true,
                  superficieM2: true,
                  precioBase: true,
                  ciudad: true,
                  urbanizacion: { select: { id: true, nombre: true } },
                },
              },
              propiedad: {
                select: {
                  id: true,
                  nombre: true,
                  tipo: true,
                  ciudad: true,
                  ubicacion: true,
                  precio: true,
                },
              },
              planPago: {
                include: {
                  pagos: {
                    orderBy: { fecha_pago: 'asc' },
                    select: {
                      id_pago_plan: true,
                      monto: true,
                      fecha_pago: true,
                      observacion: true,
                    },
                  },
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      const clientesConResumen = clientes.map((cliente) => {
        let totalVentas = 0;
        let totalPagado = 0;
        let tienePlanActivo = false;
        let saldoPendienteTotal = 0;
        let montoInicialTotal = 0;
        let totalCredito = 0;

        const ventasProcesadas = cliente.ventasComoCliente.map((venta) => {
          const precioFinal = Number(venta.precioFinal);
          totalVentas += precioFinal;

          if (venta.planPago) {
            tienePlanActivo = true;
            const montoInicial = Number(venta.planPago.montoInicial) || 0;
            const pagosPlan = venta.planPago.pagos || [];
            const pagadoPlan = pagosPlan.reduce(
              (sum, p) => sum + Number(p.monto),
              0,
            );
            const pagadoVenta = montoInicial + pagadoPlan;
            const creditoVenta = Number(venta.planPago.total);

            montoInicialTotal += montoInicial;
            totalCredito += creditoVenta;
            totalPagado += pagadoVenta;
            saldoPendienteTotal += creditoVenta - pagadoPlan;

            return {
              ...venta,
              precioFinal: Number(venta.precioFinal),
              planPago: {
                ...venta.planPago,
                total: Number(venta.planPago.total),
                monto_inicial: Number(venta.planPago.montoInicial),
                pagadoPlan,
                saldoPendiente: creditoVenta - pagadoPlan,
                montoInicialCalculado: montoInicial,
              },
            };
          } else {
            if (venta.estado === 'PAGADO') {
              totalPagado += precioFinal;
            }
            saldoPendienteTotal +=
              precioFinal - (venta.estado === 'PAGADO' ? precioFinal : 0);
            return { ...venta, precioFinal: Number(venta.precioFinal) };
          }
        });

        return {
          ...cliente,
          ventasComoCliente: ventasProcesadas,
          resumenFinanciero: {
            totalVentas,
            totalPagado,
            saldoPendiente: totalVentas - totalPagado,
            tienePlanActivo,
            porcentajePagado:
              totalVentas > 0 ? (totalPagado / totalVentas) * 100 : 0,
            montoInicialTotal,
            totalCredito,
          },
        };
      });

      return { success: true, data: { clientes: clientesConResumen } };
    } catch (error) {
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }

  async getClienteByIdWithDetails(id: number) {
    try {
      const cliente = await this.prisma.user.findUnique({
        where: { id, isActive: true, role: UserRole.CLIENTE },
        select: {
          id: true,
          fullName: true,
          ci: true,
          telefono: true,
          direccion: true,
          observaciones: true,
          email: true,
          createdAt: true,
          ventasComoCliente: {
            where: { estado: { not: 'CANCELADO' } },
            include: {
              asesor: true,
              lote: { include: { urbanizacion: true } },
              propiedad: true,
              planPago: { include: { pagos: true } },
            },
          },
        },
      });

      if (!cliente) throw new NotFoundException('Cliente no encontrado');

      let totalVentas = 0;
      let totalPagado = 0;
      let montoInicialTotal = 0;
      let totalCredito = 0;

      for (const venta of cliente.ventasComoCliente) {
        const precioFinal = Number(venta.precioFinal);
        totalVentas += precioFinal;

        if (venta.planPago) {
          const montoInicial = Number(venta.planPago.montoInicial);
          const pagosPlan = venta.planPago.pagos || [];
          const pagadoPlan = pagosPlan.reduce(
            (sum, p) => sum + Number(p.monto),
            0,
          );
          const totalPlan = Number(venta.planPago.total);

          totalPagado += montoInicial + pagadoPlan;
          montoInicialTotal += montoInicial;
          totalCredito += totalPlan;
        } else if (venta.estado === 'PAGADO') {
          totalPagado += precioFinal;
        }
      }

      const clienteData = JSON.parse(
        JSON.stringify(cliente, (key, value) => {
          if (
            value &&
            typeof value === 'object' &&
            'constructor' in value &&
            value.constructor.name === 'Decimal'
          ) {
            return Number(value);
          }
          return value;
        }),
      );

      return {
        success: true,
        data: {
          cliente: {
            ...clienteData,
            resumenFinanciero: {
              totalVentas,
              totalPagado,
              saldoPendiente: totalVentas - totalPagado,
              porcentajePagado:
                totalVentas > 0 ? (totalPagado / totalVentas) * 100 : 0,
              tienePlanActivo:
                clienteData.ventasComoCliente?.some((v: any) => v.planPago) ||
                false,
              montoInicialTotal,
              totalCredito,
            },
          },
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }
  // Asignar urbanizaciones a un usuario
  async asignarUrbanizaciones(usuarioId: number, urbanizacionIds: number[]) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: usuarioId, isActive: true },
      });
      if (!user) throw new NotFoundException('Usuario no encontrado');

      // Eliminar asignaciones anteriores y crear las nuevas
      await this.prisma.$transaction([
        this.prisma.usuarioUrbanizacion.deleteMany({
          where: { usuarioId },
        }),
        this.prisma.usuarioUrbanizacion.createMany({
          data: urbanizacionIds.map((urbanizacionId) => ({
            usuarioId,
            urbanizacionId,
          })),
        }),
      ]);

      const updated = await this.prisma.usuarioUrbanizacion.findMany({
        where: { usuarioId },
        include: { urbanizacion: true },
      });

      return {
        success: true,
        message: 'Urbanizaciones asignadas correctamente',
        data: { urbanizaciones: updated },
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Error interno del servidor');
    }
  }
}
