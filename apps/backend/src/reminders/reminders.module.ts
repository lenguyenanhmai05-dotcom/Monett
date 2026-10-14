import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Reminder, ReminderSchema } from './schemas/reminder.schema';
import { RemindersService } from './reminders.service';
import { RemindersController } from './reminders.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Reminder.name, schema: ReminderSchema }]),
  ],
  controllers: [RemindersController],
  providers: [RemindersService],
  exports: [RemindersService],
})
export class RemindersModule {}
