import Link from 'next/link';

import { Button } from '@repo/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/card';

export default function LoginPage() {
  return (
    <Card className="w-full max-w-md shadow-md">
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="text-2xl">Finance App</CardTitle>
        <CardDescription>
          Sign in to automatically track transactions from your email.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild className="w-full" size="lg">
          <Link href="/dashboard">Continue with Google</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
