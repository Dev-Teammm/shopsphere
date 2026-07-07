"use client";

import { useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Mail, Loader2, ArrowLeft, LockKeyhole } from "lucide-react";
import { authService } from "@/lib/services/auth-service";
import { PasswordResetRequest } from "@/lib/types";
import { handleApiError } from "@/lib/utils/error-handler";
import Link from "next/link";

const formSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export function ForgotPasswordForm() {
  const { toast } = useToast();
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  const resetMutation = useMutation({
    mutationFn: (request: PasswordResetRequest) => {
      return authService.requestPasswordReset(request);
    },
    onSuccess: (message) => {
      setIsSubmitted(true);
      toast({
        title: "Reset link sent",
        description:
          message || "Check your inbox for password reset instructions.",
      });
    },
    onError: (error) => {
      const errorMessage = handleApiError(error);
      toast({
        title: "Unable to send reset link",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    resetMutation.mutate(values);
  }

  if (isSubmitted) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col space-y-6">
        <div className="space-y-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Check your email
          </h1>
          <p className="text-sm text-muted-foreground">
            If an account exists for{" "}
            <span className="font-medium text-foreground">
              {form.getValues("email")}
            </span>
            , you will receive a password reset link shortly. The link is valid
            for a limited time.
          </p>
        </div>

        <div className="rounded-lg border bg-muted/40 p-4 text-left text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Did not receive it?</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Check your spam or promotions folder.</li>
            <li>Confirm you entered the email used at registration.</li>
            <li>Wait a few minutes, then try again.</li>
          </ul>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => setIsSubmitted(false)}
        >
          Send another link
        </Button>

        <Link
          href="/auth"
          className="flex items-center justify-center text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col space-y-6">
      <div className="space-y-2">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
          <LockKeyhole className="h-5 w-5 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Forgot your password?
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter the email associated with your Shopsphere account. We will email
          you a secure link to create a new password.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Work email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                    {...field}
                    disabled={resetMutation.isPending}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="w-full"
            disabled={resetMutation.isPending}
          >
            {resetMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending reset link...
              </>
            ) : (
              "Email reset link"
            )}
          </Button>
        </form>
      </Form>

      <p className="text-center text-sm text-muted-foreground">
        Remember your password?{" "}
        <Link href="/auth" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
