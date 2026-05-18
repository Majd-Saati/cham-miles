import { useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Eye, EyeOff, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

const TITLES = ["Mr", "Mrs", "Ms", "Dr"];

const COUNTRY_CODES = [
  "+961",
  "+1",
  "+44",
  "+33",
  "+49",
  "+971",
  "+966",
  "+20",
  "+90",
];

type JoinFormValues = {
  title: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  dateOfBirth: string;
  countryCode: string;
  callNumber: string;
  agreeTerms: boolean;
  agreeMarketing: boolean;
};

const initialValues: JoinFormValues = {
  title: "",
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
  dateOfBirth: "",
  countryCode: "",
  callNumber: "",
  agreeTerms: false,
  agreeMarketing: false,
};

const validationSchema = Yup.object({
  title: Yup.string().required("Required"),
  firstName: Yup.string().trim().min(1).max(50).required("Required"),
  lastName: Yup.string().trim().min(1).max(50).required("Required"),
  email: Yup.string().trim().email("Invalid email").max(255).required("Required"),
  password: Yup.string().min(8, "Min 8 characters").max(72).required("Required"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password")], "Passwords must match")
    .required("Required"),
  dateOfBirth: Yup.string().required("Required"),
  countryCode: Yup.string().required("Required"),
  callNumber: Yup.string()
    .matches(/^[0-9]{4,15}$/, "Digits only (4-15)")
    .required("Required"),
  agreeTerms: Yup.boolean().oneOf([true], "You must accept the terms"),
  agreeMarketing: Yup.boolean(),
});

export default function JoinForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const formik = useFormik<JoinFormValues>({
    initialValues,
    validationSchema,
    onSubmit: (values, { setSubmitting }) => {
      console.log("Join form submitted", values);
      setSubmitting(false);
    },
  });

  const inputBase =
    "w-full rounded-lg bg-[#F5F5F4] px-[17px] h-[50px] text-[14px]  text-[#3E3E3B] placeholder:text-[#3E3E3B] focus:outline-none focus:ring-2 focus:ring-[#006080]/40 border border-[#D4D4D2]";

  const triggerBase =
    "w-full rounded-lg bg-[#F5F5F4] px-[17px] h-[50px] text-[14px] text-[#3E3E3B] data-[placeholder]:text-[#3E3E3B] border border-[#D4D4D2] shadow-none focus:ring-2 focus:ring-[#006080]/40 focus:outline-none transition-colors hover:bg-[#EFEFED] [&>svg]:opacity-70 [&>svg]:text-[#006080]";

  const err = (key: keyof JoinFormValues) =>
    formik.touched[key] && formik.errors[key] ? (
      <p className="mt-1 text-[11px] text-red-600">{String(formik.errors[key])}</p>
    ) : null;

  const allValid =
    formik.isValid && formik.dirty && formik.values.agreeTerms;

  return (
    <div className="rounded-xl bg-[rgba(229,229,227,0.80)] px-7 py-[30px] shadow-2xl ">
      <h3 className="mb-6 text-[24px] font-semibold text-[#3E3E3B]">Create an Account</h3>

      <form onSubmit={formik.handleSubmit} className="flex flex-col gap-4" noValidate>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[146px_1fr_1fr]">
          <Select
            value={formik.values.title}
            onValueChange={(v) => formik.setFieldValue("title", v)}
          >
            <SelectTrigger className={triggerBase}>
              <SelectValue placeholder="Title" />
            </SelectTrigger>
            <SelectContent className="rounded-lg border border-[#D4D4D2] bg-white shadow-xl">
              {TITLES.map((t) => (
                <SelectItem
                  key={t}
                  value={t}
                  className="rounded-md text-[14px] text-[#3E3E3B] focus:bg-[#006080]/10 focus:text-[#006080]"
                >
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="grid grid-cols-2 gap-2 sm:contents">
          <input
            name="firstName"
            placeholder="First name"
            value={formik.values.firstName}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            className={inputBase}
          />
          <input
            name="lastName"
            placeholder="Last name"
            value={formik.values.lastName}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            className={inputBase}
          />
          </div>
        </div>
        <p className="-mt-1 text-[14px] text-[#3E3E3B]">
          Ensure the name provided matches your passport.
        </p>

        <input
          name="email"
          type="email"
          placeholder="Email address"
          value={formik.values.email}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          className={inputBase}
        />
        {err("email")}

        <div className="relative">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Password (min 8 characters)"
            value={formik.values.password}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            className={`${inputBase} pr-10`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#3E3E3B]"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {err("password")}

        <div className="relative">
          <input
            name="confirmPassword"
            type={showConfirm ? "text" : "password"}
            placeholder="Confirm Password"
            value={formik.values.confirmPassword}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            className={`${inputBase} pr-10`}
          />
          <button
            type="button"
            onClick={() => setShowConfirm((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#3E3E3B]"
            tabIndex={-1}
          >
            {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {err("confirmPassword")}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_169px_1fr]">
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  inputBase,
                  "flex items-center justify-between text-left",
                  !formik.values.dateOfBirth && "text-[#3E3E3B]",
                )}
              >
                <span>
                  {formik.values.dateOfBirth
                    ? format(new Date(formik.values.dateOfBirth), "PPP")
                    : "Date of birth"}
                </span>
                <CalendarIcon className="h-4 w-4 text-[#006080] opacity-80" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="w-auto rounded-xl border border-[#D4D4D2] bg-white p-0 shadow-2xl"
            >
              <Calendar
                mode="single"
                captionLayout="dropdown"
                selected={
                  formik.values.dateOfBirth
                    ? new Date(formik.values.dateOfBirth)
                    : undefined
                }
                onSelect={(d) =>
                  formik.setFieldValue(
                    "dateOfBirth",
                    d ? format(d, "yyyy-MM-dd") : "",
                  )
                }
                disabled={(date) =>
                  date > new Date() || date < new Date("1900-01-01")
                }
                initialFocus
                className={cn(
                  "pointer-events-auto p-3",
                  "[--cell-size:2.25rem]",
                  "[&_[data-selected-single=true]]:!bg-[#006080] [&_[data-selected-single=true]]:!text-white",
                  "[&_.rdp-today]:text-[#006080] [&_.rdp-today]:font-semibold",
                )}
              />
            </PopoverContent>
          </Popover>
          <div className="grid grid-cols-2 gap-3 sm:contents">
          <Select
            value={formik.values.countryCode}
            onValueChange={(v) => formik.setFieldValue("countryCode", v)}
          >
            <SelectTrigger className={triggerBase}>
              <SelectValue placeholder="Country code" />
            </SelectTrigger>
            <SelectContent className="max-h-[260px] rounded-lg border border-[#D4D4D2] bg-white shadow-xl">
              {COUNTRY_CODES.map((c) => (
                <SelectItem
                  key={c}
                  value={c}
                  className="rounded-md text-[14px] text-[#3E3E3B] focus:bg-[#006080]/10 focus:text-[#006080]"
                >
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input
            name="callNumber"
            placeholder="Call number"
            value={formik.values.callNumber}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            className={inputBase}
          />
          </div>
        </div>

        <label className="mt-2 flex items-center gap-[13px] text-[14px] font-medium text-[#3E3E3B]">
          <input
            type="checkbox"
            name="agreeTerms"
            checked={formik.values.agreeTerms}
            onChange={formik.handleChange}
            className="h-5 w-5 rounded border border-[#D2D5DA] accent-[#006080]"
          />
          <span>
            I agree to the{" "}
            <a className="text-[#006080] hover:underline" href="#">Terms of Service</a> and{" "}
            <a className="text-[#006080] hover:underline" href="#">Privacy Policy</a>
          </span>
        </label>

        <label className="flex items-center gap-[13px] text-[14px] font-medium text-[#3E3E3B]">
          <input
            type="checkbox"
            name="agreeMarketing"
            checked={formik.values.agreeMarketing}
            onChange={formik.handleChange}
            className="h-5 w-5 rounded border border-[#D2D5DA] accent-[#006080]"
          />
          <span>I agree to receive marketing messages from Fly Cham</span>
        </label>

        <button
          type="submit"
          disabled={!allValid || formik.isSubmitting}
          className="mt-3 h-[55px] w-full rounded-lg bg-[#D4D4D2] text-[18px] font-semibold text-[#8A8A88] transition-opacity enabled:bg-[#006080] enabled:text-white enabled:hover:opacity-90 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </form>
    </div>
  );
}
