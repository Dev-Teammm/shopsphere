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
import { KeyRound, Mail, Loader2, ArrowLeft } from "lucide-react";
import { authService } from "@/lib/services/auth-service";
import { PasswordResetRequest } from "@/lib/types";
import { handleApiError } from "@/lib/utils/error-handler";
import Link from "next/link";

const formSchema = z.object({
  email: z.string().email("Invalid email address"),
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
        title: "Success",
        description:
          message || "Password reset link has been sent to your email",
      });
    },
    onError: (error) => {
      const errorMessage = handleApiError(error);
      toast({
        title: "Error",
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
      <div className="mx-auto flex w-full flex-col space-y-6 sm:w-[350px] text-center">
        <div className="mx-auto flex items-center justify-center bg-primary/10 p-4 rounded-full">
          <Mail className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Check your email
        </h1>
        <p className="text-sm text-muted-foreground">
          We've sent a password reset link to{" "}
          <span className="font-medium text-foreground">
            {form.getValues("email")}
          </span>
          . Please check your inbox and follow the instructions.
        </p>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setIsSubmitted(false)}
        >
          Didn't receive the email? Try again
        </Button>
        <Link
          href="/auth"
          className="flex items-center justify-center text-sm text-primary hover:underline"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to login
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full flex-col space-y-6 sm:w-[350px]">
      <div className="flex flex-col space-y-2 text-center">
        <div className="mx-auto flex items-center justify-center bg-primary/10 p-4 rounded-full">
          <KeyRound className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Forgot Password
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter your email address and we'll send you a link to reset your
          password
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Address</FormLabel>
                <FormControl>
                  <Input
                    placeholder="john.doe@example.com"
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
                Sending link...
              </>
            ) : (
              "Send reset link"
            )}
          </Button>
        </form>
      </Form>

      <div className="text-center text-sm text-muted-foreground">
        <Link
          href="/auth"
          className="flex items-center justify-center text-primary hover:underline"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to login
        </Link>
      </div>
    </div>
  );
}
