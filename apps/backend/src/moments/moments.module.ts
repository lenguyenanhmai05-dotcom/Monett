import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { MomentsController } from './moments.controller';
import { MomentsService } from './moments.service';
import { Moment, MomentSchema } from './schemas/moment.schema';
import { Friendship, FriendshipSchema } from '../friends/schemas/friendship.schema';
import { User, UserSchema } from '../users/schemas/user.schema';

@Module({
  imports: [
    MulterModule.register({}),
    MongooseModule.forFeature([
      { name: Moment.name, schema: MomentSchema },
      { name: Friendship.name, schema: FriendshipSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [MomentsController],
  providers: [MomentsService],
  exports: [MomentsService],
})
export class MomentsModule {}
