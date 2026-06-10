import { Button } from '@repo/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/card';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export default function LoginPage() {
  return (
    <Card className="w-full max-w-md animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4 fill-mode-both shadow-md duration-500 motion-reduce:animate-none">
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="text-2xl">Finance App</CardTitle>
        <CardDescription>
          Sign in to automatically track transactions from your email.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild className="w-full" size="lg">
          <a href={`${API_URL}/auth/google`}>Continue with Google</a>
        </Button>
      </CardContent>
    </Card>
  );
}
