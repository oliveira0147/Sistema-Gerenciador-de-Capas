import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
export declare class AuthService {
    private readonly usersService;
    private readonly jwtService;
    constructor(usersService: UsersService, jwtService: JwtService);
    register(input: {
        email: string;
        password: string;
    }): Promise<{
        accessToken: string;
    }>;
    login(input: {
        email: string;
        password: string;
    }): Promise<{
        accessToken: string;
    }>;
    private signToken;
}
