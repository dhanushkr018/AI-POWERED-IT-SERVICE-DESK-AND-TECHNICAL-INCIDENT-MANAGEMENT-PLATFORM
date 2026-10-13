import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Field } from "@/components/forms/Field";
import { RoleBadge } from "@/components/RoleBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { formatApiError } from "@/lib/api";

const schema = z.object({
  fullName: z.string().trim().min(2, "Enter your name.").max(120),
  employeeId: z.string().trim().max(40),
  department: z.string().trim().max(80),
  jobTitle: z.string().trim().max(80),
  phone: z.string().trim().max(30),
});

export function ProfilePage() {
  const { account, updateProfile } = useAuth();
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  useEffect(() => {
    const user = account?.user;
    if (!user) return;
    reset({
      fullName: user.fullName || "",
      employeeId: user.employeeId || "",
      department: user.department || "",
      jobTitle: user.jobTitle || "",
      phone: user.phone || "",
    });
  }, [account, reset]);

  async function onSubmit(values) {
    setMessage("");
    setFormError("");
    try {
      await updateProfile(values);
      setMessage("Profile saved.");
    } catch (error) {
      setFormError(formatApiError(error));
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-3xl font-semibold text-slate-950">Profile</h1>
        <p className="mt-2 text-sm text-slate-600">
          Email stays with your sign-in account. Roles are changed by an administrator, not from this form.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {(account?.roles ?? []).map((role) => <RoleBadge key={role} role={role} />)}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Contact record</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            {formError ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">{formError}</p> : null}
            {message ? <p className="rounded-md bg-teal-50 px-3 py-2 text-sm text-teal-900">{message}</p> : null}
            <Field label="Email" htmlFor="email">
              <Input id="email" value={account?.user?.email || ""} disabled />
            </Field>
            <Field label="Full name" htmlFor="fullName" error={errors.fullName?.message}>
              <Input id="fullName" {...register("fullName")} />
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
            <Field label="Phone" htmlFor="phone" error={errors.phone?.message}>
              <Input id="phone" autoComplete="tel" {...register("phone")} />
            </Field>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save profile"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
