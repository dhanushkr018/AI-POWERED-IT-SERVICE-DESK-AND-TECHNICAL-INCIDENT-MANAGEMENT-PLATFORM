import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Field } from "@/components/forms/Field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { api, formatApiError } from "@/lib/api";
import { CATEGORY_LABELS, IMPACT_LABELS } from "@/lib/tickets";

const schema = z.object({
  title: z.string().trim().min(5, "Use a title of at least 5 characters.").max(140),
  description: z.string().trim().min(10, "Describe the technical problem.").max(4000),
  category: z.enum(Object.keys(CATEGORY_LABELS)),
  deviceLabel: z.string().trim().max(80),
  serviceName: z.string().trim().max(80),
  errorDetails: z.string().trim().max(500),
  businessImpact: z.string().trim().max(500),
  affectedUsers: z.coerce.number().int().min(1, "Enter at least 1.").max(100000),
  impactScope: z.enum(["individual", "department", "organization"]),
  troubleshooting: z.string().trim().max(2000),
});

const selectClass = "flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm";

export function TicketCreatePage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState("");
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      category: "endpoint",
      deviceLabel: "",
      serviceName: "",
      errorDetails: "",
      businessImpact: "",
      affectedUsers: 1,
      impactScope: "individual",
      troubleshooting: "",
    },
  });
  const category = watch("category");

  async function onSubmit(values) {
    setFormError("");
    try {
      const result = await api("/tickets", {
        method: "POST",
        token: session.access_token,
        body: { ...values, idempotencyKey },
      });
      navigate(`/app/tickets/${result.ticket.id}`);
    } catch (error) {
      setFormError(formatApiError(error));
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <p className="text-sm font-semibold text-teal-800">
          <Link to="/app/tickets">Tickets</Link>
        </p>
        <h1 className="mt-1 text-3xl font-semibold text-slate-950">Report a technical problem</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Priority is chosen by the service desk rules. Do not type a password, MFA code, recovery code, or private key.
        </p>
      </div>
      <form className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm" onSubmit={handleSubmit(onSubmit)} noValidate>
        {formError ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">{formError}</p> : null}
        <Field label="Title" htmlFor="title" error={errors.title?.message}>
          <Input id="title" {...register("title")} />
        </Field>
        <Field label="What is happening?" htmlFor="description" error={errors.description?.message}>
          <Textarea id="description" {...register("description")} />
        </Field>
        <Field label="Category" htmlFor="category" error={errors.category?.message}>
          <select id="category" className={selectClass} {...register("category")}>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
        {category === "security" ? (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-950">
            Security reports are treated as critical and sent to Security Response. Do not include secrets.
          </p>
        ) : null}
        <Field label="Who is affected?" htmlFor="impactScope" error={errors.impactScope?.message}>
          <select id="impactScope" className={selectClass} {...register("impactScope")}>
            {Object.entries(IMPACT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
        <Field label="Number of people affected" htmlFor="affectedUsers" error={errors.affectedUsers?.message}>
          <Input id="affectedUsers" type="number" min="1" {...register("affectedUsers")} />
        </Field>
        <Field label="Device identifier, if you know it" htmlFor="deviceLabel" error={errors.deviceLabel?.message}>
          <Input id="deviceLabel" placeholder="LT-FIN-0142" {...register("deviceLabel")} />
        </Field>
        <Field label="Application or service" htmlFor="serviceName" error={errors.serviceName?.message}>
          <Input id="serviceName" {...register("serviceName")} />
        </Field>
        <Field label="Error message" htmlFor="errorDetails" error={errors.errorDetails?.message}>
          <Input id="errorDetails" {...register("errorDetails")} />
        </Field>
        <Field label="Business impact" htmlFor="businessImpact" error={errors.businessImpact?.message}>
          <Textarea id="businessImpact" {...register("businessImpact")} />
        </Field>
        <Field label="What have you already tried?" htmlFor="troubleshooting" error={errors.troubleshooting?.message}>
          <Textarea id="troubleshooting" {...register("troubleshooting")} />
        </Field>
        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Creating ticket..." : "Create ticket"}</Button>
          <Link className="inline-flex h-10 items-center px-3 text-sm font-semibold text-slate-600" to="/app/tickets">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
