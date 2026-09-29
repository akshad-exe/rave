import { Button } from "@rave/ui/components/button";
import { useForm } from "@tanstack/react-form";
import { Link, useNavigate } from "@tanstack/react-router";
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

export default function SignUpForm() {
  const navigate = useNavigate({
    from: "/",
  });
  const { isPending } = authClient.useSession();

  const form = useForm({
    defaultValues: {
      email: "",
      name: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      await authClient.signUp.email(
        {
          email: value.email,
          name: value.name,
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
            toast.success("Sign up successful");
          },
        }
      );
    },
    validators: {
      onSubmit: z.object({
        email: z.email("Invalid email address"),
        name: z.string().min(2, "Name must be at least 2 characters"),
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
          Create Account
        </h1>
        <p className="mt-2 text-muted-foreground text-sm">
          Start building at hackathons
        </p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <form.Field name="name">
          {(field) => (
            <FormField
              controls={{
                errors: field.state.meta.errors,
                name: field.name,
                onBlur: field.handleBlur,
                onChange: field.handleChange,
                value: field.state.value,
              }}
              inputProps={{ autoComplete: "name" }}
              label="Name"
            />
          )}
        </form.Field>

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
              inputProps={{ autoComplete: "email" }}
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
              inputProps={{ autoComplete: "new-password", minLength: 8 }}
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
              {isSubmitting ? "Creating account..." : "Create Account"}
            </Button>
          )}
        </form.Subscribe>
      </form>

      <p className="mt-6 text-center text-muted-foreground text-sm">
        Already have an account?{" "}
        <Link
          className="font-medium text-primary hover:text-primary/80 hover:underline"
          to="/login"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
