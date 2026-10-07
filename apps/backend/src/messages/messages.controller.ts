import { Controller, Post, Body, UseGuards, Req, Get, Param } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  async sendMessage(
    @Req() req,
    @Body('receiverId') receiverId: string,
    @Body('text') text: string,
  ) {
    const senderId = req.user?._id?.toString() || req.user?.id || req.user?.sub;
    return this.messagesService.sendMessage(senderId, receiverId, text);
  }

  @Get(':friendId')
  async getMessages(@Req() req, @Param('friendId') friendId: string) {
    const userId = req.user?._id?.toString() || req.user?.id || req.user?.sub;
    return this.messagesService.getMessages(userId, friendId);
  }
}
