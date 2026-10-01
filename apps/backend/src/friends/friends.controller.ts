import { Controller, Post, Body, UseGuards, Req, Put, Param, Get } from '@nestjs/common';
import { FriendsService } from './friends.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/friends')
@UseGuards(JwtAuthGuard)
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Post('request')
  async sendRequest(@Req() req, @Body('recipientId') recipientId: string) {
    return this.friendsService.sendFriendRequest(req.user._id.toString(), recipientId);
  }

  @Post('add')
  async addFriend(@Req() req, @Body('recipientId') recipientId: string, @Body('friendId') friendId: string) {
    return this.friendsService.sendFriendRequest(req.user._id.toString(), recipientId || friendId);
  }

  @Put('request/:id')
  async respondRequest(@Req() req, @Param('id') requestId: string, @Body('status') status: 'accepted' | 'rejected') {
    return this.friendsService.respondToRequest(requestId, req.user._id.toString(), status);
  }

  @Get('requests')
  async getRequests(@Req() req) {
    return this.friendsService.getPendingRequests(req.user._id.toString());
  }

  @Get()
  async getFriends(@Req() req) {
    return this.friendsService.getFriends(req.user._id.toString());
  }
}
