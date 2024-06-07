import { AlertCircle } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const ChartHeader = ({ text }: { text: string }) => (
  <h1 className='text-2xl font-bold my-2'>{text}</h1>
);

export const LoadingContent = () => <Skeleton className="mt-8 w-[1300px] h-[600px]" />;

export const ErrorAlert = ({ message }: { message: string }) => (
  <Alert variant="destructive" className='my-4'>
    <AlertCircle className="h-4 w-4" />
    <AlertDescription>
      {message}
    </AlertDescription>
  </Alert>
);
