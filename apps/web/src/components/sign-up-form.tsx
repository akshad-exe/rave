import { Button } from "@rave/ui/components/button";
import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import type { FormEvent } from "react";
import { useCallback } from "react";
import { toast } from "sonner";
import z from "zod";

import { authClient } from "@/lib/auth-client";

import { FormField } from "./form-field";
import Loader from "./loader";

const selectSubmitState = (state: {
  canSubmit: boolean;
  isSubmitting: boolean;
}) => ({
  canSubmit: state.canSubmit,
  isSubmitting: state.isSubmitting,
});

export default function SignUpForm({
  onSwitchToSignIn,
}: {
  onSwitchToSignIn: () => void;
}) {
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
    <div className="mx-auto mt-10 w-full max-w-md p-6">
      <h1 className="mb-6 text-center font-bold text-3xl">Create Account</h1>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
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
                label="Name"
              />
            )}
          </form.Field>
        </div>

        <div>
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
        </div>

        <div>
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
        </div>

        <form.Subscribe selector={selectSubmitState}>
          {({ canSubmit, isSubmitting }) => (
            <Button
              className="w-full"
              disabled={!canSubmit || isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Submitting..." : "Sign Up"}
            </Button>
          )}
        </form.Subscribe>
      </form>

      <div className="mt-4 text-center">
        <Button
          className="text-indigo-600 hover:text-indigo-800"
          onClick={onSwitchToSignIn}
          variant="link"
        >
          Already have an account? Sign In
        </Button>
      </div>
    </div>
  );
}
