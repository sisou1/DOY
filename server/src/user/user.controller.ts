import { Controller, Get, Post, Body } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
    constructor(private userService: UserService) {}

    @Post()
    async create(@Body('username') username: string, @Body('password') password?: string) {
        return this.userService.createUser(username, password);
    }

    @Get()
    async list() {
        return this.userService.getUsers();
    }
}
