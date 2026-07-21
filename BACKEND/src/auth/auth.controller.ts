import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UsePipes,
  ValidationPipe,
  BadRequestException,
  Get,
  Put,
  Delete,
  Param,
  ParseIntPipe,
  Patch,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';

@Controller('auth')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ========== AUTH ENDPOINTS ==========
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(@Body() changePasswordDto: ChangePasswordDto) {
    return this.authService.changePassword(changePasswordDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() body: { refreshToken: string }) {
    if (!body.refreshToken) {
      throw new BadRequestException('Refresh token es requerido');
    }
    return this.authService.refreshToken(body.refreshToken);
  }

  // ========== USERS CRUD (ADMINISTRADOR, ASESOR, SECRETARIA, USUARIO) ==========
  @Get('users')
  async getAllUsers() {
    return this.authService.getAllUsers();
  }

  @Get('users/:id')
  async getUserById(@Param('id', ParseIntPipe) id: number) {
    return this.authService.getUserById(id);
  }

  @Put('users/:id')
  async updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.authService.updateUser(id, updateUserDto);
  }

  @Delete('users/:id')
  async deleteUser(@Param('id', ParseIntPipe) id: number) {
    return this.authService.deleteUser(id);
  }

  // ========== CLIENTES CRUD (CLIENTES QUE NO INICIAN SESIÓN) ==========
  @Post('register-cliente')
  async registerCliente(@Body() createClienteDto: CreateClienteDto) {
    return this.authService.createCliente(createClienteDto);
  }

  @Get('clientes')
  async getClientes() {
    return this.authService.getClientes();
  }

  @Put('clientes/:id')
  async updateCliente(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateClienteDto: UpdateClienteDto,
  ) {
    return this.authService.updateCliente(id, updateClienteDto);
  }

  @Delete('clientes/:id')
  async deleteCliente(@Param('id', ParseIntPipe) id: number) {
    return this.authService.deleteCliente(id);
  }

  @Get(':id')
  async getClienteById(@Param('id', ParseIntPipe) id: number) {
    return this.authService.getClienteByIdWithDetails(id);
  }

  @Patch(':id/urbanizaciones')
  async asignarUrbanizaciones(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { urbanizacionIds: number[] },
  ) {
    return this.authService.asignarUrbanizaciones(id, body.urbanizacionIds);
  }
}
