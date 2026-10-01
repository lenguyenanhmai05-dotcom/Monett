import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TransactionDocument = Transaction & Document;

@Schema({ timestamps: true })
export class Transaction {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  user: Types.ObjectId;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true, enum: ['expense', 'income'], default: 'expense' })
  type: string;

  @Prop({ required: true, default: 'Khác', index: true })
  category: string;

  @Prop({ default: '💵' })
  categoryIcon: string;

  @Prop({ default: '', trim: true })
  note: string;

  @Prop({ default: '' })
  photoUri: string;

  @Prop({ default: '' })
  walletId: string;

  @Prop({ type: Date, default: Date.now, index: true })
  date: Date;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);

TransactionSchema.set('toJSON', {
  transform: (doc, ret: any) => {
    ret.id = ret._id ? ret._id.toString() : ret.id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});
