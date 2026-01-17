import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto, LoginDto, AuthResponseDto } from './dto/auth.dto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AuthService {
  private logPath = path.join(process.cwd(), 'auth-debug.log');

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  private log(message: string) {
    try {
      const timestamp = new Date().toISOString();
      fs.appendFileSync(
        this.logPath,
        `${timestamp} [${process.pid}] ${message}\n`,
      );
    } catch {
      // Fallback to console if fs fails
      console.log(`[LOG_FAIL] ${message}`);
    }
  }

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { email, password, name, age, city } = registerDto;

    this.log(`Attempting registration for: ${email}`);

    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      this.log(`Registration failed: Email ${email} already exists`);
      throw new UnauthorizedException('Email already registered');
    }

    // Hash password
    this.log('Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);
    this.log('Password hashed');

    // Create user
    try {
      this.log('Starting DB transaction...');
      // Use transaction to ensure both user and wallet are created
      const user = await this.prisma.$transaction(async (tx) => {
        this.log('Transaction: Creating User...');
        const newUser = await tx.user.create({
          data: {
            email,
            password: hashedPassword,
            name,
            age,
            city,
          },
        });
        this.log(`Transaction: User created with ID ${newUser.id}`);

        this.log('Transaction: Creating Wallet...');
        await tx.wallet.create({
          data: {
            userId: newUser.id, // Direct assignment, assumption: user relation exists but optional/handled by DB
            balance: 0,
          },
        });
        this.log('Transaction: Wallet created');

        return newUser;
      });
      this.log('DB transaction finished successfully');

      // Generate JWT
      this.log('Generating JWT...');
      const payload = { sub: user.id, email: user.email };
      const access_token = this.jwtService.sign(payload);
      this.log('JWT generated successfully');

      return {
        access_token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar ?? undefined,
          verified: user.verified,
          city: user.city ?? undefined,
          age: user.age ?? undefined,
          bio: user.bio ?? undefined,
        },
      };
    } catch (error: unknown) {
      const errorString = JSON.stringify(
        error,
        Object.getOwnPropertyNames(error as object),
        2,
      );
      this.log(`CRITICAL REGISTRATION ERROR: ${errorString}`);
      this.log(`FULL ERROR OBJECT: ${String(error)}`);

      console.error('Registration error:', error);

      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        throw new Error('Email already exists');
      }
      throw error;
    }
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;
    this.log(`Login attempt for: ${email}`);

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      this.log(`Login failed: User ${email} not found`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      this.log(`Login failed: Invalid password for ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT
    const payload = { sub: user.id, email: user.email };
    const access_token = this.jwtService.sign(payload);
    this.log(`Login successful for ${email}`);

    return {
      access_token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar ?? undefined,
        verified: user.verified,
        city: user.city ?? undefined,
        age: user.age ?? undefined,
        bio: user.bio ?? undefined,
      },
    };
  }

  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        city: true,
        bio: true,
        age: true,
        verified: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }
}
