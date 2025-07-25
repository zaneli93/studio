import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

export default function FirebaseConfigNotice() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            Firebase Configuration Missing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-muted-foreground">
            It looks like your Firebase environment variables are not set up. This application requires Firebase for authentication and database functionality.
          </p>
          <p className="mb-2">Please follow these steps:</p>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Create a Firebase project at <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-primary underline">console.firebase.google.com</a>.</li>
            <li>In your project, go to Project settings and create a new Web App.</li>
            <li>Copy the Firebase configuration object.</li>
            <li>Create a <code className="bg-muted px-1 py-0.5 rounded">.env.local</code> file in the root of your project.</li>
            <li>Add your Firebase credentials to the <code className="bg-muted px-1 py-0.5 rounded">.env.local</code> file like this:</li>
          </ol>
          <pre className="mt-2 w-full overflow-x-auto rounded-md bg-muted p-4 text-xs">
            {`NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id`}
          </pre>
          <p className="mt-4 text-sm text-muted-foreground">After adding the variables, restart your development server.</p>
        </CardContent>
      </Card>
    </div>
  );
}
