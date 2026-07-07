"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Loader2, CheckCircle, XCircle, User, Shield } from "lucide-react";
import { toast } from "sonner";
import {
  adminInvitationService,
  AdminInvitationDTO,
  InvitationValidationResponse,
  AcceptInvitationDTO,
} from "@/lib/services/admin-invitation-service";

function AcceptInvitationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [invitation, setInvitation] = useState<AdminInvitationDTO | null>(null);
  const [validation, setValidation] =
    useState<InvitationValidationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isExistingUser, setIsExistingUser] = useState(false);
  const [userExists, setUserExists] = useState<boolean | null>(null);
  const [checkingUser, setCheckingUser] = useState(false);

  // Form states
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!token) {
      toast.error("No invitation token provided");
      router.push("/auth");
      return;
    }

    validateAndFetchInvitation();
  }, [token]);

  const validateAndFetchInvitation = async () => {
    try {
      setLoading(true);

      if (!token) {
        throw new Error("No invitation token provided");
      }

      // First validate the token using the service
      const validationResult = await adminInvitationService.validateInvitation(
        token
      );

      if (!validationResult.success || !validationResult.data) {
        throw new Error(validationResult.message || "Invalid invitation token");
      }

      setValidation(validationResult.data);

      if (!validationResult.data.canBeAccepted) {
        toast.error("This invitation cannot be accepted");
        return;
      }

      // Fetch invitation details using the service
      const invitationResult =
        await adminInvitationService.getInvitationByToken(token);

      if (!invitationResult.success || !invitationResult.data) {
        throw new Error(
          invitationResult.message || "Failed to fetch invitation details"
        );
      }

      setInvitation(invitationResult.data);
      setPhoneNumber(invitationResult.data.phoneNumber || "");

      // Check if user exists from validation response
      if (validationResult.data.userExists !== undefined) {
        setUserExists(validationResult.data.userExists);
        // Only allow "existing user" toggle if user actually exists
        if (!validationResult.data.userExists) {
          setIsExistingUser(false);
        }
      } else {
        // Fallback: check user existence separately
        const userCheckResult = await adminInvitationService.checkUserExists(token);
        if (userCheckResult.success && userCheckResult.data) {
          setUserExists(userCheckResult.data.userExists);
          if (!userCheckResult.data.userExists) {
            setIsExistingUser(false);
          }
        }
      }
    } catch (error) {
      console.error("Error validating invitation:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to validate invitation"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async () => {
    if (!invitation || !token) return;

    try {
      setSubmitting(true);
      setValidationErrors({}); // Clear previous errors

      // Validate form
      if (!isExistingUser && (!password || !confirmPassword)) {
        toast.error("Please fill in all required fields");
        return;
      }

      if (!isExistingUser && password !== confirmPassword) {
        toast.error("Passwords do not match");
        return;
      }

      if (!isExistingUser && password.length < 6) {
        toast.error("Password must be at least 6 characters long");
        return;
      }

      const acceptData: AcceptInvitationDTO = {
        invitationToken: token,
        phoneNumber: phoneNumber || undefined,
      };

      // Only include password for new users
      if (!isExistingUser) {
        acceptData.password = password;
      }

      const result = await adminInvitationService.acceptInvitation(acceptData);

      if (!result.success) {
        // Handle validation errors
        if (result.errors) {
          setValidationErrors(result.errors);
          toast.error(result.message || "Validation failed. Please check the form.");
        } else {
          // Check if error is about user not existing
          if (result.message?.includes("does not exist in the system")) {
            toast.error(result.message);
            setIsExistingUser(false);
            setUserExists(false);
          } else {
            toast.error(result.message || "Failed to accept invitation");
          }
        }
        return;
      }

      toast.success("Invitation accepted successfully! You can now log in.");
      router.push("/auth?message=invitation-accepted");
    } catch (error) {
      console.error("Error accepting invitation:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to accept invitation"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeclineInvitation = async () => {
    if (!token) return;

    try {
      setSubmitting(true);

      const result = await adminInvitationService.declineInvitation(token);

      if (!result.success) {
        throw new Error(result.message || "Failed to decline invitation");
      }

      toast.success("Invitation declined");
      router.push("/auth?message=invitation-declined");
    } catch (error) {
      console.error("Error declining invitation:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to decline invitation"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-sm text-muted-foreground">
            Validating invitation...
          </p>
        </div>
      </div>
    );
  }

  if (!validation || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-xl">Invalid Invitation</CardTitle>
            <CardDescription>
              This invitation link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/auth")} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (validation.isExpired || !validation.canBeAccepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-xl">
              {validation.isExpired
                ? "Invitation Expired"
                : "Cannot Accept Invitation"}
            </CardTitle>
            <CardDescription>
              {validation.isExpired
                ? "This invitation has expired and can no longer be accepted."
                : "This invitation cannot be accepted at this time."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/auth")} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-gray-900">
            {isExistingUser ? "Update Your Role" : "Accept Invitation"}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {isExistingUser
              ? "You've been invited to update your role in the system"
              : "Complete your account setup to join the team"}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Invitation Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-muted-foreground">Name</Label>
                <p className="font-medium">{invitation.fullName}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Email</Label>
                <p className="font-medium">{invitation.email}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Role</Label>
                <p className="font-medium">{invitation.assignedRole}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Department</Label>
                <p className="font-medium">{invitation.department || "N/A"}</p>
              </div>
            </div>

            {invitation.invitationMessage && (
              <div>
                <Label className="text-muted-foreground">Message</Label>
                <p className="text-sm mt-1 p-3 bg-gray-50 rounded-lg">
                  {invitation.invitationMessage}
                </p>
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              <p>
                Invited by: {invitation.invitedByName} (
                {invitation.invitedByEmail})
              </p>
              <p>Expires: {new Date(invitation.expiresAt).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {isExistingUser ? "Update Information" : "Create Account"}
            </CardTitle>
            <CardDescription>
              {isExistingUser
                ? "Update your phone number and accept the new role"
                : "Set up your account password and phone number"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="user-type"
                  checked={isExistingUser}
                  onCheckedChange={async (checked) => {
                    if (checked && userExists === false) {
                      // User tried to enable but doesn't exist - check again
                      setCheckingUser(true);
                      try {
                        const result = await adminInvitationService.checkUserExists(token!);
                        if (result.success && result.data) {
                          if (result.data.userExists) {
                            setUserExists(true);
                            setIsExistingUser(true);
                          } else {
                            toast.error("This email does not have an account in the system. Please create a new account.");
                            setIsExistingUser(false);
                          }
                        } else {
                          toast.error("Unable to verify account. Please try again.");
                          setIsExistingUser(false);
                        }
                      } catch (error) {
                        console.error("Error checking user existence:", error);
                        toast.error("Failed to check account status. Please try again.");
                        setIsExistingUser(false);
                      } finally {
                        setCheckingUser(false);
                      }
                    } else if (checked && userExists === true) {
                      setIsExistingUser(true);
                    } else if (!checked) {
                      setIsExistingUser(false);
                    }
                  }}
                  disabled={checkingUser || (userExists === false)}
                />
                <Label htmlFor="user-type" className="text-sm">
                  I already have an account
                </Label>
              </div>
              {userExists === false && (
                <p className="text-xs text-red-500 ml-8">
                  This email does not have an account. Please create a new account by leaving this option disabled.
                </p>
              )}
              {checkingUser && (
                <p className="text-xs text-muted-foreground ml-8">
                  Checking account status...
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value);
                  // Clear error when user starts typing
                  if (validationErrors.phoneNumber) {
                    setValidationErrors((prev) => {
                      const newErrors = { ...prev };
                      delete newErrors.phoneNumber;
                      return newErrors;
                    });
                  }
                }}
                placeholder="e.g., +1234567890 or 0712345678"
                className={validationErrors.phoneNumber ? "border-red-500" : ""}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Format: +[country code][number] or local format (e.g., +1234567890, 0712345678)
              </p>
              {validationErrors.phoneNumber && (
                <p className="text-xs text-red-500 mt-1">
                  {validationErrors.phoneNumber}
                </p>
              )}
            </div>

            {!isExistingUser && (
              <>
                <div>
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      // Clear error when user starts typing
                      if (validationErrors.password) {
                        setValidationErrors((prev) => {
                          const newErrors = { ...prev };
                          delete newErrors.password;
                          return newErrors;
                        });
                      }
                    }}
                    placeholder="Create a password"
                    className={validationErrors.password ? "border-red-500" : ""}
                    required
                  />
                  {validationErrors.password && (
                    <p className="text-xs text-red-500 mt-1">
                      {validationErrors.password}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="confirmPassword">Confirm Password *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    required
                  />
                </div>
              </>
            )}

            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                By accepting this invitation, you agree to the terms and
                conditions and will be granted {invitation.assignedRole} access
                to the system.
              </AlertDescription>
            </Alert>

            <div className="flex gap-3">
              <Button
                onClick={handleAcceptInvitation}
                disabled={submitting}
                className="flex-1"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                {isExistingUser ? "Update Role" : "Accept & Create Account"}
              </Button>

              <Button
                variant="outline"
                onClick={handleDeclineInvitation}
                disabled={submitting}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Decline
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin mx-auto mb-4 text-primary border-2 border-primary border-t-transparent rounded-full"></div>
            <p className="text-sm text-muted-foreground">
              Loading invitation...
            </p>
          </div>
        </div>
      }
    >
      <AcceptInvitationContent />
    </Suspense>
  );
}
