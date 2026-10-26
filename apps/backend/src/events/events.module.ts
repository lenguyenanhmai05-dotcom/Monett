import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { MonettEventModel, MonettEventSchema } from './schemas/event.schema';
import { EventInvitationModel, EventInvitationSchema } from './schemas/event-invitation.schema';
import { MessagesModule } from '../messages/messages.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MonettEventModel.name, schema: MonettEventSchema },
      { name: EventInvitationModel.name, schema: EventInvitationSchema },
    ]),
    MessagesModule,
    AuthModule,
  ],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
