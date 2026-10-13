import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, Navigate } from "react-router-dom";
import { z } from "zod";
import { Field } from "@/components/forms/Field";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { StatusScreen } from "@/components/StatusScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";

const schema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Use at least 8 characters."),
});

export function LoginPage() {
  const { configured, session, loading, signIn } = useAuth();
  const [formError, setFormError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });

  if (!configured) return <Navigate to="/setup" replace />;
  if (loading) return <StatusScreen title="Checking your session" />;
  if (session) return <Navigate to="/app" replace />;

  async function onSubmit(values) {
    setFormError("");
    try {
      await signIn(values.email, values.password);
    } catch (error) {
      setFormError(error.message);
    }
  }

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Use the account created for you, or register as a normal user. Registration cannot grant support or administrator access."
    >
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        {formError ? (
          <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">{formError}</p>
        ) : null}
        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" {...register("email")} />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password?.message}>
          <Input id="password" type="password" autoComplete="current-password" {...register("password")} />
        </Field>
        <Button className="w-full" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Signing in..." : "Sign in"}
        </Button>
      </form>
      <p className="mt-4 text-sm text-slate-600">
        New here? <Link className="font-semibold text-teal-800" to="/register">Create a user account</Link>
      </p>
    </AuthLayout>
  );
}
