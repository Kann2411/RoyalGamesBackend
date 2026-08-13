import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendFriendRequestDto {
  @ApiProperty({ example: 'player123', description: 'Nick of the user to send a friend request to' })
  @IsString()
  @IsNotEmpty()
  nick: string;
}
