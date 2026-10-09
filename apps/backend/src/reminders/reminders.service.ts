import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Reminder, ReminderDocument } from './schemas/reminder.schema';
import { CreateReminderDto, UpdateReminderDto } from './dto/create-reminder.dto';

@Injectable()
export class RemindersService {
  constructor(
    @InjectModel(Reminder.name)
    private readonly reminderModel: Model<ReminderDocument>,
  ) {}

  async create(userId: string, dto: CreateReminderDto): Promise<Reminder> {
    const today = new Date().toISOString().split('T')[0];
    const reminder = new this.reminderModel({
      user: new Types.ObjectId(userId),
      title: dto.title,
      date: dto.date || today,
      time: dto.time || '17:00',
      remindBeforeMinutes: dto.remindBeforeMinutes !== undefined ? dto.remindBeforeMinutes : 10,
      note: dto.note || '',
      isCompleted: false,
      isDismissed: false,
    });
    return reminder.save();
  }

  async findAll(userId: string, date?: string): Promise<Reminder[]> {
    const filter: any = { user: new Types.ObjectId(userId) };
    if (date) {
      filter.date = date;
    }
    return this.reminderModel
      .find(filter)
      .sort({ isCompleted: 1, time: 1, createdAt: -1 })
      .exec();
  }

  async toggleComplete(userId: string, id: string): Promise<Reminder> {
    const reminder = await this.reminderModel.findOne({
      _id: new Types.ObjectId(id),
      user: new Types.ObjectId(userId),
    });
    if (!reminder) {
      throw new NotFoundException('Không tìm thấy nhắc nhở này');
    }
    reminder.isCompleted = !reminder.isCompleted;
    return reminder.save();
  }

  async delete(userId: string, id: string): Promise<{ success: boolean }> {
    const result = await this.reminderModel.deleteOne({
      _id: new Types.ObjectId(id),
      user: new Types.ObjectId(userId),
    });
    if (result.deletedCount === 0) {
      throw new NotFoundException('Không tìm thấy nhắc nhở cần xóa');
    }
    return { success: true };
  }

  async update(userId: string, id: string, dto: UpdateReminderDto): Promise<Reminder> {
    const reminder = await this.reminderModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id), user: new Types.ObjectId(userId) },
      { $set: dto },
      { new: true },
    );
    if (!reminder) {
      throw new NotFoundException('Không tìm thấy nhắc nhở cần cập nhật');
    }
    return reminder;
  }
}
