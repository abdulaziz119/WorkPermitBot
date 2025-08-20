import { ApiProperty } from '@nestjs/swagger';

export class ErrorResourceDto {
    @ApiProperty({ example: 'User not found' })
    message: string;
}
