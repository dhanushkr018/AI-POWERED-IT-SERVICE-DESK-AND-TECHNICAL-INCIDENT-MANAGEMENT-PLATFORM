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

const schema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your name."),
    email: z.string().trim().email("Enter a valid email address."),
    employeeId: z.string().trim().max(40),
    department: z.string().trim().max(80),
    jobTitle: z.string().trim().max(80),
    password: z.string().min(8, "Use at least 8 characters."),
    confirmPassword: z.string().min(8, "Confirm your password."),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export function RegisterPage() {
  const { configured, session, loading, signUp } = useAuth();
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: "",
      email: "",
      employeeId: "",
      department: "",
      jobTitle: "",
      password: "",
      confirmPassword: "",
    },
  });

  if (!configured) return <Navigate to="/setup" replace />;
  if (loading) return <StatusScreen title="Checking your session" />;
  if (session) return <Navigate to="/app" replace />;

  async function onSubmit(values) {
    setFormError("");
    setNotice("");
    try {
      const result = await signUp(values);
      if (result.alreadyRegistered) {
        setNotice("That email is already registered. Sign in instead.");
        return;
      }
      if (result.needsEmailConfirmation) {
        setNotice("Check your email to confirm the account, then sign in. For a classroom demo, you can turn off email confirmation in Supabase.");
      }
    } catch (error) {
      setFormError(error.message);
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="This creates a normal user. A support executive or administrator role can only be granted later by an administrator."
    >
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        {formError ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">{formError}</p> : null}
        {notice ? <p className="rounded-md bg-teal-50 px-3 py-2 text-sm text-teal-900">{notice}</p> : null}
        <Field label="Full name" htmlFor="fullName" error={errors.fullName?.message}>
          <Input id="fullName" autoComplete="name" {...register("fullName")} />
        </Field>
        <Field label="Work email" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" {...register("email")} />
        </Field>
        <Field label="Employee ID" htmlFor="employeeId" error={errors.employeeId?.message}>
          <Input id="employeeId" {...register("employeeId")} />
        </Field>
        <Field label="Department" htmlFor="department" error={errors.department?.message}>
          <Input id="department" {...register("department")} />
        </Field>
        <Field label="Job title" htmlFor="jobTitle" error={errors.jobTitle?.message}>
          <Input id="jobTitle" {...register("jobTitle")} />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password?.message}>
          <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
        </Field>
        <Field label="Confirm password" htmlFor="confirmPassword" error={errors.confirmPassword?.message}>
          <Input id="confirmPassword" type="password" autoComplete="new-password" {...register("confirmPassword")} />
        </Field>
        <Button className="w-full" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating account..." : "Create account"}
        </Button>
      </form>
      <p className="mt-4 text-sm text-slate-600">
        Already registered? <Link className="font-semibold text-teal-800" to="/login">Sign in</Link>
      </p>
    </AuthLayout>
  );
}
