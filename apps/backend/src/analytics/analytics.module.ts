import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { Transaction, TransactionSchema } from '../transactions/schemas/transaction.schema';
import { Budget, BudgetSchema } from '../budgets/schemas/budget.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Moment, MomentSchema } from '../moments/schemas/moment.schema';
import { TransactionsModule } from '../transactions/transactions.module';
import { BudgetsModule } from '../budgets/budgets.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
      { name: Budget.name, schema: BudgetSchema },
      { name: User.name, schema: UserSchema },
      { name: Moment.name, schema: MomentSchema },
    ]),
    TransactionsModule,
    BudgetsModule,
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
