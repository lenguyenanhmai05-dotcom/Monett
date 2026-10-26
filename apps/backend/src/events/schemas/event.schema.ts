import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type EventDocument = MonettEventModel & Document;

@Schema({ _id: false })
export class EventMemberSub {
  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  user?: Types.ObjectId;

  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ default: '' })
  email?: string;

  @Prop({ default: '' })
  avatarUrl?: string;

  @Prop({ required: true, enum: ['owner', 'member'], default: 'member' })
  role: 'owner' | 'member';

  @Prop({ required: true, enum: ['accepted', 'pending', 'declined'], default: 'accepted' })
  status: 'accepted' | 'pending' | 'declined';

  @Prop({ default: '' })
  invitedAt?: string;

  @Prop({ default: '' })
  joinedAt?: string;
}

export const EventMemberSubSchema = SchemaFactory.createForClass(EventMemberSub);

@Schema({ _id: false })
export class EventExpenseSub {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true, default: 0 })
  amount: number;

  @Prop({ default: 'Chi phí' })
  category?: string;

  @Prop({ default: '💸' })
  categoryIcon?: string;

  @Prop({ default: '' })
  date: string; // 'dd/mm/yyyy'

  @Prop({ default: () => new Date().toISOString() })
  createdAt: string;

  @Prop({ enum: ['expense', 'income'], default: 'expense' })
  type?: 'expense' | 'income';

  @Prop({ default: '' })
  payer?: string;

  @Prop({ default: '' })
  note?: string;
}

export const EventExpenseSubSchema = SchemaFactory.createForClass(EventExpenseSub);

@Schema({ timestamps: true, collection: 'events' })
export class MonettEventModel {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  owner: Types.ObjectId;

  @Prop({ default: '' })
  ownerId: string;

  @Prop({ default: '' })
  ownerName: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  startDate: string;

  @Prop({ default: '' })
  endDate?: string;

  @Prop({ default: '' })
  location?: string;

  @Prop({ default: 0 })
  estimatedBudget: number;

  @Prop({ default: 0 })
  spentAmount: number;

  @Prop({ default: 0 })
  incomeAmount: number;

  @Prop({ default: '' })
  description?: string;

  @Prop({ enum: ['upcoming', 'ongoing', 'completed'], default: 'ongoing' })
  status: 'upcoming' | 'ongoing' | 'completed';

  @Prop({ type: [EventMemberSubSchema], default: [] })
  members: EventMemberSub[];

  @Prop({ type: [EventExpenseSubSchema], default: [] })
  expenses: EventExpenseSub[];
}

export const MonettEventSchema = SchemaFactory.createForClass(MonettEventModel);

MonettEventSchema.set('toJSON', {
  transform: (doc, ret: any) => {
    ret.id = ret._id ? ret._id.toString() : ret.id;
    return ret;
  },
});
