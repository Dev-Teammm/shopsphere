"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  register,
  clearError,
  clearSignupResponse,
} from "@/lib/store/slices/authSlice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import RewardDialog from "@/components/RewardDialog";

export default function RegisterForm() {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    phoneNumber: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    [key: string]: string;
  }>({});

  const dispatch = useAppDispatch();
  const router = useRouter();
  const { isLoading, error, signupResponse } = useAppSelector(
    (state) => state.auth,
  );

  // Removed automatic timer redirect to show success dialog properly
  useEffect(() => {
    if (signupResponse && signupResponse.userId) {
      console.log("Signup successful, showing dialog");
    }
  }, [signupResponse]);

  const validateForm = () => {
    const errors: { [key: string]: string } = {};

    if (!formData.firstName.trim()) {
      errors.firstName = t("auth.firstNameRequired");
    } else if (formData.firstName.length < 2) {
      errors.firstName = t("auth.firstNameMin");
    }

    if (!formData.lastName.trim()) {
      errors.lastName = t("auth.lastNameRequired");
    } else if (formData.lastName.length < 2) {
      errors.lastName = t("auth.lastNameMin");
    }

    if (!formData.email.trim()) {
      errors.email = t("auth.emailRequired");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = t("auth.emailInvalid");
    }

    if (!formData.password) {
      errors.password = t("auth.passwordRequired");
    } else if (formData.password.length < 8) {
      errors.password = t("auth.passwordMin");
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = t("auth.confirmPasswordRequired");
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = t("auth.passwordsNoMatch");
    }

    if (formData.phoneNumber && formData.phoneNumber.trim()) {
      const phoneRegex = /^[\+]?[0-9\s\-\(\)]{7,20}$/;
      if (!phoneRegex.test(formData.phoneNumber)) {
        errors.phoneNumber = t("auth.phoneInvalid");
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const userData = {
      email: formData.email,
      password: formData.password,
      firstName: formData.firstName,
      lastName: formData.lastName,
      phoneNumber: formData.phoneNumber || undefined,
    };

    try {
      await dispatch(register(userData)).unwrap();
    } catch (error) {
      console.error("Registration failed:", error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (validationErrors[name]) {
      setValidationErrors((prev) => ({ ...prev, [name]: "" }));
    }

    if (error) {
      dispatch(clearError());
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {t("auth.signUpTitle")}
          </CardTitle>
          <CardDescription className="text-center">
            {t("auth.signUpDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">{t("auth.firstName")} *</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  type="text"
                  placeholder={t("auth.firstName")}
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                  disabled={isLoading}
                  className={validationErrors.firstName ? "border-red-500" : ""}
                />
                {validationErrors.firstName && (
                  <p className="text-sm text-red-600">
                    {validationErrors.firstName}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">{t("auth.lastName")} *</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  type="text"
                  placeholder={t("auth.lastName")}
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                  disabled={isLoading}
                  className={validationErrors.lastName ? "border-red-500" : ""}
                />
                {validationErrors.lastName && (
                  <p className="text-sm text-red-600">
                    {validationErrors.lastName}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t("auth.email")} *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder={t("auth.emailPlaceholder")}
                value={formData.email}
                onChange={handleInputChange}
                required
                disabled={isLoading}
                className={validationErrors.email ? "border-red-500" : ""}
              />
              {validationErrors.email && (
                <p className="text-sm text-red-600">{validationErrors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t("auth.password")} *</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t("auth.passwordPlaceholder")}
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  disabled={isLoading}
                  className={validationErrors.password ? "border-red-500" : ""}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {validationErrors.password && (
                <p className="text-sm text-red-600">
                  {validationErrors.password}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                {t("auth.confirmPassword")} *
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder={t("auth.confirmPassword")}
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required
                  disabled={isLoading}
                  className={
                    validationErrors.confirmPassword ? "border-red-500" : ""
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {validationErrors.confirmPassword && (
                <p className="text-sm text-red-600">
                  {validationErrors.confirmPassword}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">{t("auth.phoneNumber")} *</Label>
              <Input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                placeholder="+250 788 123 456 (Sample)"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                disabled={isLoading}
                className={validationErrors.phoneNumber ? "border-red-500" : ""}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] mt-1 bg-gray-50 p-2 rounded border border-gray-100">
                <div className="flex items-center gap-1">
                  <div
                    className={`h-1.5 w-1.5 rounded-full ${formData.phoneNumber.replace(/[^0-9]/g, "").length >= 7 && formData.phoneNumber.replace(/[^0-9]/g, "").length <= 15 ? "bg-green-500" : "bg-gray-300"}`}
                  />
                  <span
                    className={
                      formData.phoneNumber.replace(/[^0-9]/g, "").length >= 7 &&
                      formData.phoneNumber.replace(/[^0-9]/g, "").length <= 15
                        ? "text-green-700 font-medium"
                        : "text-gray-500"
                    }
                  >
                    7-15 digits
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <div
                    className={`h-1.5 w-1.5 rounded-full ${/^[+]?[0-9\s-]*$/.test(formData.phoneNumber) && formData.phoneNumber.length > 0 ? "bg-green-500" : "bg-gray-300"}`}
                  />
                  <span
                    className={
                      /^[+]?[0-9\s-]*$/.test(formData.phoneNumber) &&
                      formData.phoneNumber.length > 0
                        ? "text-green-700 font-medium"
                        : "text-gray-500"
                    }
                  >
                    Digits & + allowed
                  </span>
                </div>
                {formData.phoneNumber.startsWith("0") && (
                  <div className="flex items-center gap-1 col-span-full">
                    <div
                      className={`h-1.5 w-1.5 rounded-full ${formData.phoneNumber.replace(/[^0-9]/g, "").length === 10 || formData.phoneNumber.replace(/[^0-9]/g, "").length === 9 ? "bg-green-500" : "bg-amber-500"}`}
                    />
                    <span
                      className={
                        formData.phoneNumber.replace(/[^0-9]/g, "").length ===
                          10 ||
                        formData.phoneNumber.replace(/[^0-9]/g, "").length === 9
                          ? "text-green-700 font-medium"
                          : "text-amber-700"
                      }
                    >
                      Local format: 9-10 digits (current:{" "}
                      {formData.phoneNumber.replace(/[^0-9]/g, "").length})
                    </span>
                  </div>
                )}
                {!formData.phoneNumber && (
                  <span className="text-[10px] text-gray-400 italic col-span-full">
                    Format: +250... or 078...
                  </span>
                )}
              </div>
              {validationErrors.phoneNumber && (
                <p className="text-sm text-red-600">
                  {validationErrors.phoneNumber}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("auth.creatingAccount")}
                </>
              ) : (
                t("auth.signUp")
              )}
            </Button>

            <div className="text-center">
              <div className="text-sm text-gray-600">
                {t("auth.hasAccount")}{" "}
                <Link
                  href="/auth/login"
                  className="text-green-600 hover:text-green-500"
                >
                  {t("auth.signIn")}
                </Link>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <RewardDialog
        isOpen={!!signupResponse}
        onClose={() => {
          dispatch(clearSignupResponse());
          router.push("/auth/login?message=signup-success");
        }}
        awardedPoints={signupResponse?.awardedPoints || 0}
        pointsDescription={signupResponse?.pointsDescription}
      />
    </div>
  );
}
