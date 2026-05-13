/**
 * UserFormModal — slide-over panel for creating and editing a user.
 *
 * Design decisions:
 * - Slide-over (right side panel) rather than a centred modal to avoid
 *   obscuring the table behind it — the admin can still see context.
 * - Controlled externally: isOpen / onClose / onSuccess props.
 * - Pre-populated via `initialValues` when editing; empty when creating.
 * - React Hook Form + Zod for type-safe, declarative validation.
 * - Password field only shown when creating (not when editing — admins
 *   use the dedicated password-change endpoint for that).
 * - Success callback lets the parent decide what to do after save
 *   (close modal, show toast, etc.).
 */
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, User, Mail, Phone, Shield, Lock } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { RoleBadge } from "./RoleBadge";
import { ROLES, ROLE_LABELS } from "@/utils/constants";
import type { Role } from "@/utils/constants";
import type {
  UserDetail,
  CreateUserPayload,
  UpdateUserPayload,
} from "../types";

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const createSchema = z.object({
  email: z.string().email("Enter a valid email address").toLowerCase(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  first_name: z.string().min(1, "First name is required").trim(),
  last_name: z.string().min(1, "Last name is required").trim(),
  role: z.enum([
    ROLES.ADMIN,
    ROLES.HR_MANAGER,
    ROLES.RECRUITER,
    ROLES.CANDIDATE,
  ]),
  phone: z.string().trim().optional().or(z.literal("")),
});

const updateSchema = z.object({
  first_name: z.string().min(1, "First name is required").trim(),
  last_name: z.string().min(1, "Last name is required").trim(),
  email: z.string().email("Enter a valid email address").toLowerCase(),
  phone: z.string().trim().optional().or(z.literal("")),
});

type CreateFormData = z.infer<typeof createSchema>;
type UpdateFormData = z.infer<typeof updateSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called with validated form data — parent hook handles the API call. */
  onSubmit: (data: CreateUserPayload | UpdateUserPayload) => Promise<void>;
  /** Pass a user to enable edit mode; omit for create mode. */
  initialValues?: Partial<UserDetail>;
  isLoading?: boolean;
}

// ─── Role selector sub-component ──────────────────────────────────────────────

function RoleOption({
  role,
  selected,
  onClick,
}: {
  role: Role;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        flex items-center gap-2 w-full px-3 py-2 rounded-lg border text-left
        transition-all duration-150
        ${
          selected
            ? "border-blue-300 bg-blue-50 ring-2 ring-blue-100"
            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
        }
      `}
    >
      <RoleBadge role={role} showIcon size="sm" />
      {selected && (
        <span className="ml-auto w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-white" />
        </span>
      )}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function UserFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialValues,
  isLoading = false,
}: UserFormModalProps) {
  const isEditing = !!initialValues;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<CreateFormData>({
    resolver: zodResolver(
      isEditing
        ? (updateSchema as unknown as typeof createSchema)
        : createSchema,
    ),
    defaultValues: {
      email: initialValues?.email ?? "",
      first_name: initialValues?.first_name ?? "",
      last_name: initialValues?.last_name ?? "",
      role: initialValues?.role ?? ROLES.CANDIDATE,
      phone: initialValues?.phone ?? "",
      password: "",
    },
  });

  const selectedRole = isEditing ? undefined : watch("role");

  // Reset form when modal opens with new initialValues
  useEffect(() => {
    if (isOpen) {
      reset({
        email: initialValues?.email ?? "",
        first_name: initialValues?.first_name ?? "",
        last_name: initialValues?.last_name ?? "",
        role: initialValues?.role ?? ROLES.CANDIDATE,
        phone: initialValues?.phone ?? "",
        password: "",
      });
    }
  }, [isOpen, initialValues, reset]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, isLoading, onClose]);

  const handleFormSubmit = async (data: CreateFormData) => {
    await onSubmit(data);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
    >
      {/* Scrim — click to close */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={() => !isLoading && onClose()}
      />

      {/* Slide-over panel */}
      <div className="relative z-10 w-full max-w-md bg-white h-full flex flex-col shadow-2xl border-l border-slate-200 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {isEditing ? "Edit User" : "Create New User"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEditing
                ? `Editing ${initialValues.full_name}`
                : "Create a new admin-managed account"}
            </p>
          </div>
          <button
            onClick={() => !isLoading && onClose()}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Close panel"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form body */}
        <form
          id="user-form"
          onSubmit={handleSubmit(handleFormSubmit)}
          className="flex-1 px-6 py-5 space-y-5"
          noValidate
        >
          {/* Name row */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              id="first_name"
              label="First name"
              placeholder="Alice"
              leftIcon={<User size={14} />}
              error={errors.first_name?.message}
              {...register("first_name")}
            />
            <Input
              id="last_name"
              label="Last name"
              placeholder="Smith"
              error={errors.last_name?.message}
              {...register("last_name")}
            />
          </div>

          {/* Email */}
          <Input
            id="email"
            type="email"
            label="Email address"
            placeholder="alice@company.com"
            leftIcon={<Mail size={14} />}
            error={errors.email?.message}
            {...register("email")}
          />

          {/* Phone (optional) */}
          <Input
            id="phone"
            type="tel"
            label="Phone number (optional)"
            placeholder="+1 555 000 0000"
            leftIcon={<Phone size={14} />}
            error={errors.phone?.message}
            {...register("phone")}
          />

          {/* Password — create only */}
          {!isEditing && (
            <Input
              id="password"
              type="password"
              label="Password"
              placeholder="Minimum 8 characters"
              leftIcon={<Lock size={14} />}
              hint="Must contain uppercase, number, and special character."
              error={errors.password?.message}
              {...register("password")}
            />
          )}

          {/* Role selector — create only */}
          {!isEditing && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                <Shield size={13} className="text-slate-400" />
                Role
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(ROLE_LABELS) as Role[]).map((role) => (
                  <RoleOption
                    key={role}
                    role={role}
                    selected={selectedRole === role}
                    onClick={() => setValue("role", role, { shouldDirty: true })}
                  />
                ))}
              </div>
              {errors.role && (
                <p className="text-xs text-red-600">{errors.role.message}</p>
              )}
            </div>
          )}
        </form>

        {/* Footer — sticky at bottom */}
        <div className="sticky bottom-0 bg-white border-t border-slate-100 px-6 py-4 flex justify-end gap-3">
          <Button
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="user-form"
            variant="primary"
            size="md"
            loading={isLoading}
            disabled={isEditing && !isDirty}
          >
            {isEditing ? "Save Changes" : "Create User"}
          </Button>
        </div>
      </div>
    </div>
  );
}
