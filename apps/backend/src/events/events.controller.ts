import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EventsService } from './events.service';
import { CreateEventDto, UpdateEventDto, InviteFriendDto } from './dto/create-event.dto';

@Controller('api/events')
@UseGuards(JwtAuthGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  private getUserId(req: any): string {
    return (req.user?._id || req.user?.id || req.user?.sub).toString();
  }

  private getUserFullName(req: any): string {
    return req.user?.fullName || req.user?.name || '';
  }

  private getUserEmail(req: any): string {
    return req.user?.email || '';
  }

  @Get('invitations/pending')
  async getPendingInvitations(@Req() req) {
    const userId = this.getUserId(req);
    const userEmail = this.getUserEmail(req);
    return this.eventsService.getPendingInvitations(userId, userEmail);
  }

  @Post('invitations/:inviteId/accept')
  async acceptInvitation(@Req() req, @Param('inviteId') inviteId: string) {
    const userId = this.getUserId(req);
    const fullName = this.getUserFullName(req);
    const email = this.getUserEmail(req);
    return this.eventsService.acceptInvitation(userId, fullName, email, inviteId);
  }

  @Post('invitations/:inviteId/decline')
  async declineInvitation(@Req() req, @Param('inviteId') inviteId: string) {
    const userId = this.getUserId(req);
    return this.eventsService.declineInvitation(userId, inviteId);
  }

  @Get()
  async findAll(@Req() req) {
    const userId = this.getUserId(req);
    const email = this.getUserEmail(req);
    return this.eventsService.findAllForUser(userId, email);
  }

  @Post()
  async create(@Req() req, @Body() dto: CreateEventDto) {
    const userId = this.getUserId(req);
    const fullName = this.getUserFullName(req);
    const email = this.getUserEmail(req);
    return this.eventsService.create(userId, fullName, email, dto);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.eventsService.findById(id);
  }

  @Put(':id')
  async update(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
  ) {
    const userId = this.getUserId(req);
    return this.eventsService.update(userId, id, dto);
  }

  @Delete(':id')
  async delete(@Req() req, @Param('id') id: string) {
    const userId = this.getUserId(req);
    return this.eventsService.delete(userId, id);
  }

  @Post(':id/invite')
  async inviteFriend(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: InviteFriendDto,
  ) {
    const userId = this.getUserId(req);
    const fullName = this.getUserFullName(req);
    const email = this.getUserEmail(req);
    return this.eventsService.inviteFriend(userId, fullName, email, id, dto);
  }
}
