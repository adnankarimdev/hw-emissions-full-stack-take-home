"use client"

import { FormEvent, useState } from "react"
import { Building2Icon, Loader2Icon, PlusIcon } from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useCreateSiteMutation } from "@/features/sites/api/site-mutations"
import { getApiErrorMessage } from "@/lib/api/client"

const createSiteFormSchema = z.object({
  name: z.string().trim().min(2, "Enter a site name."),
  emissionLimitKg: z.coerce
    .number<number>()
    .positive("Emission limit must be greater than zero."),
  operator: z.string().trim().min(2, "Enter an operator."),
  location: z.string().trim().min(2, "Enter a location."),
})

type CreateSiteFormState = {
  name: string
  emissionLimitKg: string
  operator: string
  location: string
}

type CreateSiteFormField = keyof CreateSiteFormState
type CreateSiteFormErrors = Partial<Record<CreateSiteFormField, string>>

const initialFormState: CreateSiteFormState = {
  name: "",
  emissionLimitKg: "",
  operator: "",
  location: "",
}

export function CreateSiteForm() {
  const [formState, setFormState] =
    useState<CreateSiteFormState>(initialFormState)
  const [errors, setErrors] = useState<CreateSiteFormErrors>({})
  const createSiteMutation = useCreateSiteMutation()

  function updateField(field: CreateSiteFormField, value: string) {
    setFormState((current) => ({
      ...current,
      [field]: value,
    }))
    setErrors((current) => ({
      ...current,
      [field]: undefined,
    }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const result = createSiteFormSchema.safeParse(formState)

    if (!result.success) {
      setErrors(toFormErrors(result.error))
      return
    }

    setErrors({})
    createSiteMutation.mutate(result.data, {
      onSuccess: (site) => {
        setFormState(initialFormState)
        toast.success(`Created ${site.name}`)
      },
      onError: (error) => {
        toast.error(getApiErrorMessage(error))
      },
    })
  }

  return (
    <Card id="create-site">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Building2Icon className="size-4 text-muted-foreground" />
          <CardTitle>Create Site</CardTitle>
        </div>
        <CardDescription>Register an industrial asset for monitoring</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit} noValidate>
        <CardContent className="grid gap-4">
          <FormField error={errors.name} fieldId="site-name" label="Site Name">
            <Input
              id="site-name"
              value={formState.name}
              onChange={(event) => updateField("name", event.target.value)}
              aria-invalid={Boolean(errors.name)}
              placeholder="Bear Creek Pad 14"
            />
          </FormField>
          <FormField
            error={errors.emissionLimitKg}
            fieldId="emission-limit"
            label="Emission Limit"
          >
            <Input
              id="emission-limit"
              type="number"
              min="0"
              step="0.001"
              value={formState.emissionLimitKg}
              onChange={(event) =>
                updateField("emissionLimitKg", event.target.value)
              }
              aria-invalid={Boolean(errors.emissionLimitKg)}
              placeholder="12000"
            />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField
              error={errors.operator}
              fieldId="site-operator"
              label="Operator"
            >
              <Input
                id="site-operator"
                value={formState.operator}
                onChange={(event) =>
                  updateField("operator", event.target.value)
                }
                aria-invalid={Boolean(errors.operator)}
                placeholder="North Ridge Energy"
              />
            </FormField>
            <FormField
              error={errors.location}
              fieldId="site-location"
              label="Location"
            >
              <Input
                id="site-location"
                value={formState.location}
                onChange={(event) =>
                  updateField("location", event.target.value)
                }
                aria-invalid={Boolean(errors.location)}
                placeholder="Grande Prairie, AB"
              />
            </FormField>
          </div>
          {createSiteMutation.isError ? (
            <p role="alert" className="text-sm text-destructive">
              {getApiErrorMessage(createSiteMutation.error)}
            </p>
          ) : null}
        </CardContent>
        <CardFooter className="pt-4">
          <Button
            type="submit"
            className="w-full"
            disabled={createSiteMutation.isPending}
          >
            {createSiteMutation.isPending ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <PlusIcon />
            )}
            Create Site
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

type FormFieldProps = {
  children: React.ReactNode
  error?: string
  fieldId: string
  label: string
}

function FormField({ children, error, fieldId, label }: FormFieldProps) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={fieldId}>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

function toFormErrors(error: z.ZodError): CreateSiteFormErrors {
  const errors: CreateSiteFormErrors = {}

  for (const issue of error.issues) {
    const field = issue.path[0]

    if (isCreateSiteFormField(field) && !errors[field]) {
      errors[field] = issue.message
    }
  }

  return errors
}

function isCreateSiteFormField(value: unknown): value is CreateSiteFormField {
  return (
    value === "name" ||
    value === "emissionLimitKg" ||
    value === "operator" ||
    value === "location"
  )
}
