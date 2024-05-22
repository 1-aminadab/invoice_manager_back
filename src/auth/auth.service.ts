import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthDto } from './dto/auth.dto';
import * as bcrypt from 'bcrypt'
import { JwtService } from '@nestjs/jwt';
import { Tokens } from './types';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService
    ) {

    }
    hashData(data: string) {
        return bcrypt.hash(data, 10)
    }
    async getToken(userId: number, email: string) {
        const payload = { sub: userId, email }
        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(
                payload,
                {
                    expiresIn: 60 * 15,
                    secret: "at-secret"
                }

            ),
            this.jwtService.signAsync(
                payload,
                {
                    expiresIn: 60 * 60 * 24 * 7,
                    secret: "rt-secret"
                }

            )
        ])

        return {
            access_token: accessToken,
            refresh_token: refreshToken
        }

    }

    async signupLocal(dto: AuthDto): Promise<Tokens> {
        console.log(dto);
        try {
            const hash = await this.hashData(dto.password)
            const newUser = await this.prisma.user.create({
                data: {
                    email: dto.email,
                    hash
                }
            })
            console.log("new user", newUser);

            const tokens = await this.getToken(newUser.id, newUser.email)
            console.log(tokens);
            await this.updateRefreshTokenHash(newUser.id, tokens.refresh_token)
            return tokens
        } catch (error) {
            console.log(error);
        }


    }

    async singinLocal(dto: AuthDto): Promise<Tokens> {
        const user = await this.prisma.user.findUnique({
            where: {
                email: dto.email,
            }
        })
        if (!user) throw new ForbiddenException("Access Denied")
        const passwordMatches = await bcrypt.compare(dto.password, user.hash)
        if (!passwordMatches) throw new ForbiddenException("Password dont match")
        const tokens = await this.getToken(user.id, user.email)
        await this.updateRefreshTokenHash(user.id, tokens.refresh_token)
        return tokens
    }
    async logout(userId: number) {
        const updatedUser = await this.prisma.user.updateMany({
            where: {
                id: userId,
                hashedRt: {
                    not: null
                }
            },
            data: {
                hashedRt: null
            }
        })
        return updatedUser
    }
    async refreshTokens(userId: number, refreshToken: string) {
        const user = await this.prisma.user.findUnique({
            where: {
                id: userId
            }
        })
        
        if (!user) throw new ForbiddenException("Access denied")
            
        const hash = await this.hashData(refreshToken)
        console.log("refresh token ",refreshToken);
        console.log("refresh token hash", hash);
        console.log("token from user", user.hashedRt)
        
        const isuserMatch = await bcrypt.compare(hash, user.hashedRt)
        console.log(isuserMatch);
        
        if (!isuserMatch) throw new ForbiddenException("Access denied")

        const tokens = await this.getToken(user.id, user.email)
    console.log(tokens);
    
        await this.updateRefreshTokenHash(user.id, tokens.refresh_token)
    }
    async updateRefreshTokenHash(userId: number, refreshToken: string) {
        const hash = await this.hashData(refreshToken)
        await this.prisma.user.update({
            where: { id: userId },
            data: { hashedRt: hash }
        })
    }


}
