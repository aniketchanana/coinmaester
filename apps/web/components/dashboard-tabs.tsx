'use client';

import dynamic from 'next/dynamic';
import * as React from 'react';

import { Card, CardContent } from '@repo/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/ui/tabs';

import { TransactionsTable } from './transactions-table';

const EmailSyncTable = dynamic(
  () => import('./email-sync-table').then((module) => module.EmailSyncTable),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-32 items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Loading email sync status...
        </p>
      </div>
    ),
  },
);

export function DashboardTabs() {
  const [activeTab, setActiveTab] = React.useState('transactions');
  const [hasOpenedEmailTab, setHasOpenedEmailTab] = React.useState(false);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === 'email-sync') {
      setHasOpenedEmailTab(true);
    }
  };

  return (
    <div className="space-y-8">
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="email-sync">Email Sync Status</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          <Card className="shadow-sm pt-2">
            <CardContent>
              <TransactionsTable />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email-sync">
          <Card className="shadow-sm pt-2">
            <CardContent>
              {hasOpenedEmailTab ? <EmailSyncTable /> : null}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
