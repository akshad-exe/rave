import { Button } from "@rave/ui/components/button";
import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import type { FormEvent } from "react";
import { useCallback } from "react";
import { toast } from "sonner";
import z from "zod";
import { FormField } from "@/components/form-field";
import { authClient } from "@/lib/auth-client";
import Loader from "./loader";

const selectSubmitState = (state: {
  canSubmit: boolean;
  isSubmitting: boolean;
}) => ({
  canSubmit: state.canSubmit,
  isSubmitting: state.isSubmitting,
});

export default function SignInForm({
  onSwitchToSignUp,
}: {
  onSwitchToSignUp: () => void;
}) {
  const navigate = useNavigate({
    from: "/",
  });
  const { isPending } = authClient.useSession();

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      await authClient.signIn.email(
        {
          email: value.email,
          password: value.password,
        },
        {
          onError: (error) => {
            toast.error(error.error.message || error.error.statusText);
          },
          onSuccess: () => {
            navigate({
              to: "/dashboard",
            });
            toast.success("Sign in successful");
          },
        }
      );
    },
    validators: {
      onSubmit: z.object({
        email: z.email("Invalid email address"),
        password: z.string().min(8, "Password must be at least 8 characters"),
      }),
    },
  });

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      event.stopPropagation();
      form.handleSubmit();
    },
    [form]
  );

  if (isPending) {
    return <Loader />;
  }

  return (
    <div className="w-full">
      <div className="mb-8 text-center">
        <h1 className="font-bold font-display text-2xl text-foreground sm:text-3xl">
          Welcome Back
        </h1>
        <p className="mt-2 text-muted-foreground text-sm">
          Sign in to your account to continue
        </p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <form.Field name="email">
          {(field) => (
            <FormField
              controls={{
                errors: field.state.meta.errors,
                name: field.name,
                onBlur: field.handleBlur,
                onChange: field.handleChange,
                value: field.state.value,
              }}
              label="Email"
              type="email"
            />
          )}
        </form.Field>

        <form.Field name="password">
          {(field) => (
            <FormField
              controls={{
                errors: field.state.meta.errors,
                name: field.name,
                onBlur: field.handleBlur,
                onChange: field.handleChange,
                value: field.state.value,
              }}
              label="Password"
              type="password"
            />
          )}
        </form.Field>

        <form.Subscribe selector={selectSubmitState}>
          {({ canSubmit, isSubmitting }) => (
            <Button
              className="w-full"
              disabled={!canSubmit || isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Signing in..." : "Sign In"}
            </Button>
          )}
        </form.Subscribe>
      </form>

      <p className="mt-6 text-center text-muted-foreground text-sm">
        Don't have an account?{" "}
        <Button
          className="text-primary hover:text-primary/80"
          onClick={onSwitchToSignUp}
          variant="link"
        >
          Sign Up
        </Button>
      </p>
    </div>
  );
}
