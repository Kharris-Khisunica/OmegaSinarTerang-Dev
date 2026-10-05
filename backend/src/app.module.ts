import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health/health.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuditInterceptor } from './modules/audit/interceptors/audit.interceptor';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProductsModule } from './modules/products/products.module';
import { CustomersModule } from './modules/customers/customers.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { WarehousesModule } from './modules/warehouses/warehouses.module';
import { SettingsModule } from './modules/settings/settings.module';
import { AuthorizationRequestsModule } from './modules/authorization-requests/authorization-requests.module';
import { JournalEntriesModule } from './modules/journal-entries/journal-entries.module';
import { ChartOfAccountsModule } from './modules/chart-of-accounts/chart-of-accounts.module';
import { ExportModule } from './core/export/export.module';
import { BrandsModule } from './modules/brands/brands.module';
import { UnitsModule } from './modules/units/units.module';
import { SalesmenModule } from './modules/salesmen/salesmen.module';
import { ReceivablesModule } from './core/receivables/receivables.module';
import { StepUpModule } from './core/step-up/step-up.module';
import { StockRecorderModule } from './core/stock-recorder/stock-recorder.module';
import { JournalPosterModule } from './core/journal-poster/journal-poster.module';
import { VoidModule } from './core/void/void.module';
import { PeriodLockModule } from './core/period-lock/period-lock.module';
import { JournalManualModule } from './modules/journal-manual/journal-manual.module';
import { OpeningBalanceModule } from './modules/opening-balance/opening-balance.module';
import { WarehouseMutationsModule } from './modules/warehouse-mutations/warehouse-mutations.module';
import { AccountResolverModule } from './core/account-resolver/account-resolver.module';
import { TaxRatesModule } from './core/tax-rates/tax-rates.module';
import { PurchaseInvoicesModule } from './modules/purchase-invoices/purchase-invoices.module';
import { TaxRatesHttpModule } from './modules/tax-rates/tax-rates.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get<string>('DB_USERNAME', 'postgres'),
        password: config.get<string>('DB_PASSWORD', 'postgres'),
        database: config.get<string>('DB_NAME', 'omega_dev'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false,
      }),
    }),
    HealthModule,
    AuditModule,
    UsersModule,
    AuthModule,
    ProductsModule,
    CustomersModule,
    SuppliersModule,
    WarehousesModule,
    SettingsModule,
    AuthorizationRequestsModule,
    JournalEntriesModule,
    ChartOfAccountsModule,
    ExportModule,
    BrandsModule,
    UnitsModule,
    SalesmenModule,
    ReceivablesModule,
    StepUpModule,
    StockRecorderModule,
    JournalPosterModule,
    VoidModule,
    PeriodLockModule,
    JournalManualModule,
    OpeningBalanceModule,
    WarehouseMutationsModule,
    AccountResolverModule,
    TaxRatesModule,
    PurchaseInvoicesModule,
    TaxRatesHttpModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_INTERCEPTOR, useExisting: AuditInterceptor },
  ],
})
export class AppModule {}
